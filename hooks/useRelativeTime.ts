import { useMemo, useSyncExternalStore } from 'react';

let clock = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      clock = Date.now();
      listeners.forEach((notify) => notify());
    }, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getClock = () => clock;

function formatRelativeTime(timestamp: string, now: number): string {
  const date = new Date(timestamp);
  const time = date.getTime();
  if (!Number.isFinite(time)) return 'date unavailable';

  const seconds = Math.floor((now - time) / 1000);

  // Allow ordinary device/server clock skew, but never label malformed
  // far-future content as "just now" indefinitely.
  if (seconds < -300) return 'date unavailable';

  if (seconds >= 86_400) {
    const isCurrentYear = date.getFullYear() === new Date(now).getFullYear();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' as const }),
    });
  }

  const intervals = [
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ] as const;
  for (const [unit, secondsInUnit] of intervals) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  return 'just now';
}

export function useRelativeTime(timestamp: string): string {
  const now = useSyncExternalStore(subscribe, getClock, getClock);
  return useMemo(() => formatRelativeTime(timestamp, now), [now, timestamp]);
}
