import AppRefreshControl from '@/components/appRefreshControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { onTabRefresh } from '@/lib/tabRefresh';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

// The Floor: the app's live rooms. One debate per daily pick — the
// biggest story and the most divided one — each with a shared thread.
export type Debate = {
  id: string;
  debate_date: string;
  kind: 'biggest' | 'contested' | 'trending';
  subtopic_id: string | null;
  title: string;
  total_votes: number;
  comment_count: number;
  my_position: number | null;
};

type RecapDebate = Debate & { distribution: { bins: number[]; median: number | null } };

const kindMeta = (c: Palette): Record<Debate['kind'], { label: string; color: string; bg: string }> => ({
  biggest: { label: 'Biggest story', color: c.accentDeep, bg: c.accentSoftBg },
  contested: { label: 'Most divided', color: c.red, bg: c.redBg },
  trending: { label: 'Trending', color: c.amber, bg: c.amberBg },
});

export default function DebateTab() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const KIND_META = useMemo(() => kindMeta(c), [c]);
  const [debates, setDebates] = useState<Debate[] | null>(null);
  const [recap, setRecap] = useState<RecapDebate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInflight = useRef(false);
  const refreshTriggeredThisDrag = useRef(false);

  const load = useCallback(async () => {
    try {
      const [today, yesterday] = await Promise.all([
        api<Debate[]>('/debates'),
        api<RecapDebate[]>('/debates/recap').catch(() => [] as RecapDebate[]),
      ]);
      setDebates(today);
      setRecap(yesterday);
    } catch (err: any) {
      console.log('Error loading debates:', err?.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refreshFloor = useCallback(async () => {
    if (refreshInflight.current) return;
    refreshInflight.current = true;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
      refreshInflight.current = false;
    }
  }, [load]);

  const onPullRefresh = useCallback(async () => {
    if (refreshTriggeredThisDrag.current) return;
    refreshTriggeredThisDrag.current = true;
    await refreshFloor();
  }, [refreshFloor]);

  // Re-tapping The Floor's tab button jumps to the top and reloads
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    return onTabRefresh('debate', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      refreshFloor();
    });
  }, [refreshFloor]);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      alwaysBounceVertical
      onScrollBeginDrag={() => {
        refreshTriggeredThisDrag.current = false;
      }}
      refreshControl={
        <AppRefreshControl
          refreshing={refreshing}
          onRefresh={onPullRefresh}
          indicatorVisible={false}
        />
      }
    >
      <ThemedText type="title" style={styles.title}>The Floor</ThemedText>
      <ThemedText style={styles.subtitle}>{today} · pick a room, take a stance</ThemedText>

      {debates && debates.length === 0 && (
        <ThemedView style={styles.emptyCard}>
          <ThemedText style={styles.emptyText}>
            No debates yet today — they generate as soon as enough stories cluster. Check back shortly.
          </ThemedText>
        </ThemedView>
      )}

      {debates?.map((debate) => {
        const meta = KIND_META[debate.kind];
        const joined = debate.my_position != null;
        return (
          <Pressable
            key={debate.id}
            onPress={() => router.push(`/debate/${debate.id}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedView style={styles.card}>
              <ThemedView style={[styles.kindChip, { backgroundColor: meta.bg }]}>
                <ThemedText style={[styles.kindChipText, { color: meta.color }]}>{meta.label}</ThemedText>
              </ThemedView>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={3}>
                {debate.title}
              </ThemedText>
              <ThemedView style={styles.cardFooter}>
                <ThemedText style={styles.cardStats}>
                  {debate.total_votes} voice{debate.total_votes === 1 ? '' : 's'} · {debate.comment_count} comment{debate.comment_count === 1 ? '' : 's'}
                </ThemedText>
                <ThemedView style={styles.cardCta}>
                  <ThemedText style={[styles.cardCtaText, joined && { color: c.success }]}>
                    {joined ? 'You’re in' : 'Take a stance'}
                  </ThemedText>
                  <IconSymbol
                    name={joined ? 'checkmark.circle.fill' : 'chevron.right'}
                    size={16}
                    color={joined ? c.success : c.primary}
                  />
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </Pressable>
        );
      })}

      {/* Yesterday's rooms, with where they landed — the closing beat */}
      {recap.length > 0 && (
        <>
          <ThemedText type="defaultSemiBold" style={styles.recapHeader}>Yesterday on the Floor</ThemedText>
          {recap.map((room) => (
            <Pressable
              key={room.id}
              onPress={() => router.push(`/debate/${room.id}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <RecapCard room={room} />
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function landedLabel(median: number | null, c: Palette): { text: string; color: string } {
  if (median == null) return { text: 'No verdict', color: c.muted };
  if (median < 0.45) return { text: 'Room leaned left', color: c.blue };
  if (median > 0.55) return { text: 'Room leaned right', color: c.red };
  return { text: 'Room split the center', color: c.subtle };
}

function RecapCard({ room }: { room: RecapDebate }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const max = Math.max(...room.distribution.bins, 1);
  const landed = landedLabel(room.distribution.median, c);
  const myBin = room.my_position != null ? Math.min(Math.floor(room.my_position * 10), 9) : -1;
  return (
    <ThemedView style={styles.recapCard}>
      <ThemedText type="defaultSemiBold" style={styles.recapTitle} numberOfLines={2}>{room.title}</ThemedText>
      <ThemedView style={styles.recapBars}>
        {room.distribution.bins.map((n, i) => (
          <ThemedView key={i} style={styles.recapCol}>
            <ThemedView
              style={[
                styles.recapBar,
                { height: 4 + (n / max) * 32, backgroundColor: i === myBin ? c.accentDeep : c.barTrack },
              ]}
            />
          </ThemedView>
        ))}
      </ThemedView>
      <ThemedView style={styles.recapFooter}>
        <ThemedText style={[styles.recapLanded, { color: landed.color }]}>{landed.text}</ThemedText>
        <ThemedText style={styles.recapStats}>
          {room.total_votes} voice{room.total_votes === 1 ? '' : 's'}
          {room.my_position != null ? ' · you weighed in' : ''}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    paddingTop: 88,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: c.primary,
  },
  subtitle: {
    color: c.muted,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 16,
    gap: 10,
  },
  kindChip: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kindChipText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  cardStats: {
    color: c.muted,
    fontSize: 13,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  cardCtaText: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 24,
  },
  emptyText: {
    color: c.subtle,
    textAlign: 'center',
    lineHeight: 20,
  },
  recapHeader: {
    fontWeight: '800',
    fontSize: 16,
    color: c.subtle,
    marginTop: 20,
    marginBottom: 2,
  },
  recapCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    padding: 16,
    gap: 10,
  },
  recapTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  recapBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 3,
    backgroundColor: 'transparent',
  },
  recapCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  recapBar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  recapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  recapLanded: {
    fontSize: 14,
    fontWeight: '800',
  },
  recapStats: {
    color: c.muted,
    fontSize: 12,
  },
});
