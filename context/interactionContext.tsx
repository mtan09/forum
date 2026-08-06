import { useAuth } from '@/context/authContext';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

export type InteractionKind = 'post' | 'article' | 'comment';
export type InteractionVote = 'up' | 'down' | null;

export type InteractionSnapshot = {
  upvotes?: number;
  downvotes?: number;
  myVote?: InteractionVote;
  bookmarked?: boolean;
  commentCount?: number;
  replyCount?: number;
  repostCount?: number;
  reposted?: boolean;
  deleted?: boolean;
};

type InteractionUpdater = (
  current: InteractionSnapshot,
) => InteractionSnapshot | Partial<InteractionSnapshot>;

const EMPTY_SNAPSHOT: InteractionSnapshot = Object.freeze({});
const records = new Map<string, InteractionSnapshot>();
const recordListeners = new Map<string, Set<() => void>>();
const scopeListeners = new Map<string, Set<() => void>>();
const scopeRevisions = new Map<string, number>();

const InteractionScopeContext = createContext('signed-out');

function recordKey(scope: string, kind: InteractionKind, id: string): string {
  return `${scope}:${kind}:${id}`;
}

function snapshotsEqual(left: InteractionSnapshot, right: InteractionSnapshot): boolean {
  return left.upvotes === right.upvotes
    && left.downvotes === right.downvotes
    && left.myVote === right.myVote
    && left.bookmarked === right.bookmarked
    && left.commentCount === right.commentCount
    && left.replyCount === right.replyCount
    && left.repostCount === right.repostCount
    && left.reposted === right.reposted
    && left.deleted === right.deleted;
}

function emit(scope: string, key: string) {
  recordListeners.get(key)?.forEach((listener) => listener());
  scopeRevisions.set(scope, (scopeRevisions.get(scope) ?? 0) + 1);
  scopeListeners.get(scope)?.forEach((listener) => listener());
}

function writeRecord(scope: string, key: string, next: InteractionSnapshot) {
  const current = records.get(key) ?? EMPTY_SNAPSHOT;
  if (snapshotsEqual(current, next)) return;
  records.set(key, next);
  emit(scope, key);
}

function primeRecord(
  scope: string,
  kind: InteractionKind,
  id: string,
  initial: InteractionSnapshot,
) {
  if (!id) return;
  const key = recordKey(scope, kind, id);
  if (records.has(key)) return;
  // The mounting row already rendered from `initial`; seeding silently avoids
  // turning a long feed mount into a burst of global revision updates.
  records.set(key, { ...initial });
}

function clearScope(scope: string) {
  const prefix = `${scope}:`;
  for (const key of records.keys()) {
    if (key.startsWith(prefix)) records.delete(key);
  }
  scopeRevisions.set(scope, (scopeRevisions.get(scope) ?? 0) + 1);
  scopeListeners.get(scope)?.forEach((listener) => listener());
}

export function InteractionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const scope = user?.id ?? 'signed-out';
  const previousScope = useRef(scope);

  useEffect(() => {
    if (previousScope.current === scope) return;
    clearScope(previousScope.current);
    clearScope(scope);
    previousScope.current = scope;
  }, [scope]);

  return (
    <InteractionScopeContext.Provider value={scope}>
      {children}
    </InteractionScopeContext.Provider>
  );
}

export function useInteractionController() {
  const scope = useContext(InteractionScopeContext);

  return useMemo(() => ({
    get(kind: InteractionKind, id: string, fallback: InteractionSnapshot = EMPTY_SNAPSHOT) {
      return { ...fallback, ...(records.get(recordKey(scope, kind, id)) ?? EMPTY_SNAPSHOT) };
    },
    prime(kind: InteractionKind, id: string, initial: InteractionSnapshot) {
      primeRecord(scope, kind, id, initial);
    },
    patch(
      kind: InteractionKind,
      id: string,
      patch: Partial<InteractionSnapshot>,
      fallback: InteractionSnapshot = EMPTY_SNAPSHOT,
    ) {
      if (!id) return;
      const key = recordKey(scope, kind, id);
      const current = { ...fallback, ...(records.get(key) ?? EMPTY_SNAPSHOT) };
      writeRecord(scope, key, { ...current, ...patch });
    },
    update(
      kind: InteractionKind,
      id: string,
      updater: InteractionUpdater,
      fallback: InteractionSnapshot = EMPTY_SNAPSHOT,
    ) {
      if (!id) return;
      const key = recordKey(scope, kind, id);
      const current = { ...fallback, ...(records.get(key) ?? EMPTY_SNAPSHOT) };
      writeRecord(scope, key, { ...current, ...updater(current) });
    },
  }), [scope]);
}

export function useContentInteraction(
  kind: InteractionKind,
  id: string,
  initial: InteractionSnapshot,
) {
  const scope = useContext(InteractionScopeContext);
  const controller = useInteractionController();
  const key = recordKey(scope, kind, id);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const sourceSnapshotRef = useRef<{ key: string; snapshot: InteractionSnapshot }>({
    key,
    snapshot: initial,
  });

  const subscribe = useCallback((listener: () => void) => {
    let listeners = recordListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      recordListeners.set(key, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) recordListeners.delete(key);
    };
  }, [key]);
  const getSnapshot = useCallback(
    () => records.get(key) ?? EMPTY_SNAPSHOT,
    [key],
  );
  const cached = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const previousSource = sourceSnapshotRef.current;
    if (previousSource.key === key && !snapshotsEqual(previousSource.snapshot, initialRef.current)) {
      // A mounted row received a genuinely newer API snapshot (for example,
      // after pull-to-refresh). Reconcile the shared record from that source.
      controller.patch(kind, id, initialRef.current);
    } else {
      controller.prime(kind, id, initialRef.current);
    }
    sourceSnapshotRef.current = { key, snapshot: { ...initialRef.current } };
  }, [
    controller,
    id,
    initial.bookmarked,
    initial.commentCount,
    initial.deleted,
    initial.downvotes,
    initial.myVote,
    initial.upvotes,
    initial.replyCount,
    initial.repostCount,
    initial.reposted,
    key,
    kind,
  ]);

  const state = useMemo(() => ({ ...initial, ...cached }), [cached, initial]);
  const getCurrent = useCallback(
    () => controller.get(kind, id, initialRef.current),
    [controller, id, kind],
  );
  const patch = useCallback(
    (next: Partial<InteractionSnapshot>) => controller.patch(kind, id, next, initialRef.current),
    [controller, id, kind],
  );
  const update = useCallback(
    (updater: InteractionUpdater) => controller.update(kind, id, updater, initialRef.current),
    [controller, id, kind],
  );

  return { state, getCurrent, patch, update };
}

export function useInteractionRevision(): number {
  const scope = useContext(InteractionScopeContext);
  const subscribe = useCallback((listener: () => void) => {
    let listeners = scopeListeners.get(scope);
    if (!listeners) {
      listeners = new Set();
      scopeListeners.set(scope, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) scopeListeners.delete(scope);
    };
  }, [scope]);
  const getSnapshot = useCallback(() => scopeRevisions.get(scope) ?? 0, [scope]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
