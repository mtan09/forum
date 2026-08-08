import { Platform } from 'react-native';

let lastProductRoute = '/';

export function rememberProductRoute(route: string) {
  if (route !== '/feedback') lastProductRoute = route;
}

export function getLastProductRoute() {
  return lastProductRoute;
}

// ---------- Deep link held across sign-in ----------
// A notification email links to a real screen (/post/:id, /dm/:id). Opening it
// in a browser with no session bounced to the landing page and dropped the
// path, so every email link behaved like "open the homepage". Hold the
// destination while the user authenticates and hand it back afterwards.
//
// Native does not need this — a notification tapped while signed out stays
// pending in expo-notifications until attachNotificationRouter drains it — but
// the redirect logic is shared, so the helper is platform-neutral.

const PENDING_ROUTE_KEY = 'forum.pendingRoute';
let pendingRoute: string | null = null;

/**
 * Only in-app paths worth returning to. `/` is the default landing spot,
 * `/auth/*` and `/onboarding` are the flow itself, and a protocol-relative
 * `//host` would navigate off-origin.
 */
function isReturnable(route: string): boolean {
  return (
    route.startsWith('/') &&
    !route.startsWith('//') &&
    route !== '/' &&
    route !== '/onboarding' &&
    !route.startsWith('/auth')
  );
}

// sessionStorage keeps the destination through a reload on the auth screens and
// dies with the tab. It is unavailable in some privacy modes, hence the guards.
function session(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function rememberPendingRoute(route: string) {
  if (!isReturnable(route)) return;
  pendingRoute = route;
  try {
    session()?.setItem(PENDING_ROUTE_KEY, route);
  } catch {
    // The module-level copy still covers the in-tab navigation case.
  }
}

/** Read without consuming — safe to call during render. */
export function peekPendingRoute(): string | null {
  if (pendingRoute) return pendingRoute;
  try {
    const stored = session()?.getItem(PENDING_ROUTE_KEY) ?? null;
    if (stored && isReturnable(stored)) {
      pendingRoute = stored;
      return stored;
    }
  } catch {
    // Fall through to null.
  }
  return null;
}

export function clearPendingRoute() {
  pendingRoute = null;
  try {
    session()?.removeItem(PENDING_ROUTE_KEY);
  } catch {
    // Already cleared in memory, which is what the next peek reads first.
  }
}
