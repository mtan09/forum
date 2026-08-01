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
const FLOOR_NOTIF_ID_KEY = 'forum.floorReminderId';
const REMINDER_HOUR = 9; // 9am local

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
  const existing = await AsyncStorage.getItem(FLOOR_NOTIF_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing).catch(() => {});
    await AsyncStorage.removeItem(FLOOR_NOTIF_ID_KEY);
  }
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
// an in-app path in data.url).
export function attachNotificationRouter(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      router.push(url as never);
    }
  });
  return () => sub.remove();
}
