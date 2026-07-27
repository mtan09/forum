let lastProductRoute = '/';

export function rememberProductRoute(route: string) {
  if (route !== '/feedback') lastProductRoute = route;
}

export function getLastProductRoute() {
  return lastProductRoute;
}
