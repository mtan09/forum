import * as Haptics from 'expo-haptics';

// One shared vocabulary of haptic cues so the whole app feels consistent
// (the tab bar's HapticTab set the precedent). No-ops on platforms without
// haptics; every call is fire-and-forget.
const ios = process.env.EXPO_OS === 'ios';

/** Light tick for ordinary taps: votes, bookmarks, toggles, chips. */
export function tapLight() {
  if (ios) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium thump for bigger commitments: send, post, pin a stance. */
export function tapMedium() {
  if (ios) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Success notification: something was created/saved/shared. */
export function notifySuccess() {
  if (ios) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning for destructive confirmations: block, delete, report. */
export function notifyWarning() {
  if (ios) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Selection tick for segmented controls / picking among options. */
export function selectTick() {
  if (ios) Haptics.selectionAsync().catch(() => {});
}
