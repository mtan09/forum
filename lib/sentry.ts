import Constants from 'expo-constants';

let sentry: typeof import('@sentry/react-native') | null = null;

function withoutQueryOrFragment(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.split(/[?#]/, 1)[0];
}

function redactNetworkBreadcrumb<T extends { data?: Record<string, unknown> }>(breadcrumb: T): T {
  if (!breadcrumb.data) return breadcrumb;
  const data = { ...breadcrumb.data };
  for (const key of ['url', 'from', 'to']) {
    if (key in data) data[key] = withoutQueryOrFragment(data[key]);
  }
  for (const key of [
    'body',
    'requestBody',
    'request_body',
    'responseBody',
    'response_body',
    'query',
    'queryString',
    'query_string',
  ]) {
    delete data[key];
  }
  return { ...breadcrumb, data };
}

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
      beforeBreadcrumb(breadcrumb) {
        return redactNetworkBreadcrumb(breadcrumb);
      },
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
        if (event.request) {
          event.request.url = withoutQueryOrFragment(event.request.url) as string | undefined;
          delete event.request.query_string;
          delete event.request.data;
          delete event.request.cookies;
        }
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(redactNetworkBreadcrumb);
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
