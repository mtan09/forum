// Crash reporting for the app. Inert until EXPO_PUBLIC_SENTRY_DSN is set
// (add it to .env / EAS secrets). Guarded so Expo Go — where the native
// module may be unavailable — never crashes on startup.
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enableNativeCrashHandling: true,
    });
  } catch (err: any) {
    console.log('[sentry] init skipped:', err?.message);
  }
}
