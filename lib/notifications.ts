import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// Show the reminder even if it happens to fire while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// The Floor resets daily, which is the app's natural retention hook. This
// schedules one repeating local notification (no server/push infra needed)
// and remembers its id so toggling off cancels exactly that one — never
// anyone else's scheduled notifications.
const FLOOR_NOTIF_ID_KEY = 'forum.floorReminderId.v2';
// v1 scheduled the reminder with no data payload, so tapping it only
// foregrounded the app. The schedule lives in iOS rather than being rebuilt on
// launch, so those installs need one forced reschedule — see
// ensureFloorReminderCurrent below.
const LEGACY_FLOOR_NOTIF_ID_KEY = 'forum.floorReminderId';
const REMINDER_HOUR = 9; // 9am local
// The reminder repeats daily and cannot know tomorrow's debate id, so it opens
// the Floor tab, which lists that day's rooms.
const FLOOR_ROUTE = '/debate';

export async function enableFloorReminder(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return false;

  // Replace any existing reminder so we never stack duplicates
  await disableFloorReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'The Floor is live 🏛️',
      body: "Today's debate rooms are open. Take a stance before you see where everyone lands.",
      data: { url: FLOOR_ROUTE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(FLOOR_NOTIF_ID_KEY, id);
  return true;
}

export async function disableFloorReminder(): Promise<void> {
  // Both keys, so toggling off part-way through the v1 migration cannot strand
  // the old notification with nothing left pointing at it.
  for (const key of [FLOOR_NOTIF_ID_KEY, LEGACY_FLOOR_NOTIF_ID_KEY]) {
    const existing = await AsyncStorage.getItem(key);
    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing).catch(() => {});
      await AsyncStorage.removeItem(key);
    }
  }
}

// One-time repair for installs that scheduled the payload-less v1 reminder.
// No-op once migrated, so it is safe to call on every launch.
export async function ensureFloorReminderCurrent(): Promise<void> {
  const legacy = await AsyncStorage.getItem(LEGACY_FLOOR_NOTIF_ID_KEY).catch(() => null);
  if (!legacy) return;
  await Notifications.cancelScheduledNotificationAsync(legacy).catch(() => {});
  await AsyncStorage.removeItem(LEGACY_FLOOR_NOTIF_ID_KEY).catch(() => {});
  await enableFloorReminder();
}

// ---------- Remote push (replies, upvotes, DMs) ----------
// The server sends via Expo's push service; this registers the device token
// after sign-in. NOTE: remote push does not work inside Expo Go (SDK 53+) —
// it activates in the EAS development/production build. The try/catch keeps
// Expo Go silent instead of crashing.
const PUSH_TOKEN_KEY = 'forum.pushToken';

export async function registerForPush(
  options: { requestPermission?: boolean } = {}
): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted && settings.canAskAgain && options.requestPermission !== false) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return false;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    // Local Expo manifests do not have an EAS project id until `eas init`
    // has linked the app. Push is unavailable in that state, so skip cleanly
    // instead of invoking Expo's token API and producing a noisy warning.
    if (!projectId) return false;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api('/users/me/push-token', { body: { token, platform: Platform.OS } });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return true;
  } catch (err: any) {
    const message = String(err?.message ?? 'Unknown push registration error');
    // Expo Go cannot register remote push on current SDKs. That is an
    // expected capability gap; surface other failures so they remain visible.
    if (/expo go|development build/i.test(message)) return false;
    console.warn('[push] registration failed:', message);
    return false;
  }
}

export async function pushPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

// Permission alone does not mean this installation can receive remote push.
// The token is persisted only after the API confirms server registration.
export async function pushRegistrationReady(): Promise<boolean> {
  const [permission, token] = await Promise.all([
    pushPermissionGranted(),
    AsyncStorage.getItem(PUSH_TOKEN_KEY),
  ]);
  return permission && !!token;
}

export async function unregisterPush(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  try {
    if (token) {
      await api('/users/me/push-token', { method: 'DELETE', body: { token } });
    }
  } catch {
    // Signing out must still discard the local ownership marker. If the
    // network deletion failed, the next signed-in user repairs ownership by
    // re-registering the same device token from Settings.
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
  }
}

// Tapping a notification routes to the content it's about (the server puts
// an in-app path in data.url; the Floor reminder sets its own).
function routeToNotification(response: Notifications.NotificationResponse): boolean {
  // A dismissal or a custom action is not a request to navigate.
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;
  const url = response.notification.request.content.data?.url;
  if (typeof url !== 'string' || !url.startsWith('/')) return false;
  router.push(url as never);
  return true;
}

export function attachNotificationRouter(): () => void {
  // A tap that launches the app from a terminated state is delivered to native
  // before this listener can exist — expo-notifications does not replay it, so
  // the pending response has to be drained explicitly. This is the usual case
  // for the 9am reminder.
  try {
    const pending = Notifications.getLastNotificationResponse();
    if (pending && routeToNotification(pending)) {
      // Only clear once handled. While signed out the caller never attaches,
      // and leaving the response set is what lets the deep link survive until
      // auth finishes; clearing it here stops a later re-attach from
      // re-navigating.
      Notifications.clearLastNotificationResponse();
    }
  } catch {
    // Both APIs throw UnavailabilityError where the native module is missing
    // (Expo Go). Live taps still route through the listener below.
  }

  const sub = Notifications.addNotificationResponseReceivedListener(routeToNotification);
  return () => sub.remove();
}
