// Expo's push and scheduled-notification APIs are native-only for this app.
// Keeping a web-specific implementation prevents the web bundle from
// registering unsupported listeners (and emitting a warning on every build).
export async function enableFloorReminder(): Promise<boolean> {
  return false;
}

export async function disableFloorReminder(): Promise<void> {}

export async function registerForPush(
  _options: { requestPermission?: boolean } = {}
): Promise<boolean> {
  return false;
}

export async function pushPermissionGranted(): Promise<boolean> {
  return false;
}

export async function pushRegistrationReady(): Promise<boolean> {
  return false;
}

export async function unregisterPush(): Promise<void> {}

export function attachNotificationRouter(): () => void {
  return () => {};
}
