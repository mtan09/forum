// Tapping the tab-bar button of the screen you're already on re-taps into
// this tiny emitter: the tab layout emits, the focused screen subscribes and
// responds by scrolling to top + refreshing (like every major social app).
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function onTabRefresh(tab: string, fn: Listener): () => void {
  let set = listeners.get(tab);
  if (!set) {
    set = new Set();
    listeners.set(tab, set);
  }
  set.add(fn);
  return () => { set!.delete(fn); };
}

export function emitTabRefresh(tab: string) {
  listeners.get(tab)?.forEach((fn) => fn());
}
