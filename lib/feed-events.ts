import { api } from '@/lib/api';

export type FeedMode = 'for_you' | 'random' | 'against';
export type FeedItemKind = 'post' | 'article';

export type RecommendationContext = {
  sessionId: string;
  algorithmVersion: string;
  feedMode: FeedMode;
  position?: number;
};

type FeedEvent = RecommendationContext & {
  itemType: FeedItemKind;
  itemId: string;
  eventType: 'impression' | 'dwell' | 'open' | 'outbound_open';
  dwellMs?: number;
};

let queue: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const eventId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export const createFeedSessionId = () => `feed-${eventId()}`;

export function queueFeedEvent(event: FeedEvent) {
  queue.push({
    event_id: eventId(),
    session_id: event.sessionId,
    algorithm_version: event.algorithmVersion,
    feed_mode: event.feedMode,
    item_type: event.itemType,
    item_id: event.itemId,
    event_type: event.eventType,
    position: event.position,
    dwell_ms: event.dwellMs,
  });
  if (queue.length >= 20) {
    void flushFeedEvents();
  } else if (!timer) {
    timer = setTimeout(() => void flushFeedEvents(), 1_250);
  }
}

export async function flushFeedEvents() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0, 50);
  try {
    await api('/feed/events', { body: { events } });
  } catch (error: any) {
    // Feed telemetry must never interrupt scrolling. Keep one bounded retry
    // for transient failures, then let future interactions continue normally.
    if (queue.length < 100) queue = [...events, ...queue];
    console.log('Feed events will retry:', error?.message);
  }
}

/** Drop session-bound telemetry when authentication ends or never existed. */
export function discardFeedEvents() {
  if (timer) clearTimeout(timer);
  timer = null;
  queue = [];
}
