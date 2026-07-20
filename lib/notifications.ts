import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

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
