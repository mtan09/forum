import Constants from 'expo-constants';

let sentry: typeof import('@sentry/react-native') | null = null;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native');
    sentry?.init({
      dsn,
      environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
      release: `forum@${Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? 'unknown'}`,
      dist: Constants.nativeBuildVersion ?? undefined,
      tracesSampleRate: 0.1,
      enableNativeCrashHandling: true,
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
          delete event.user.username;
        }
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.Authorization;
          delete event.request.headers.cookie;
          delete event.request.headers.Cookie;
        }
        return event;
      },
    });
  } catch (err: any) {
    console.log('[sentry] init skipped:', err?.message);
  }
}

export function captureAppException(error: unknown, context?: Record<string, unknown>) {
  sentry?.captureException(error, context ? { extra: context } : undefined);
}
