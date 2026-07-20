import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

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

const KIND_META: Record<Debate['kind'], { label: string; color: string; bg: string }> = {
  biggest: { label: 'Biggest story', color: '#9A00FF', bg: '#F1E8FB' },
  contested: { label: 'Most divided', color: '#DC2626', bg: '#FDE8E8' },
  trending: { label: 'Trending', color: '#B45309', bg: '#FEF3C7' },
};

export default function DebateTab() {
  const router = useRouter();
  const [debates, setDebates] = useState<Debate[] | null>(null);
  const [recap, setRecap] = useState<RecapDebate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                  <ThemedText style={[styles.cardCtaText, joined && { color: '#14DD78' }]}>
                    {joined ? 'You’re in' : 'Take a stance'}
                  </ThemedText>
                  <IconSymbol
                    name={joined ? 'checkmark.circle.fill' : 'chevron.right'}
                    size={16}
                    color={joined ? '#14DD78' : '#B647FF'}
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

function landedLabel(median: number | null): { text: string; color: string } {
  if (median == null) return { text: 'No verdict', color: '#8D8D8D' };
  if (median < 0.45) return { text: 'Room leaned left', color: '#2563EB' };
  if (median > 0.55) return { text: 'Room leaned right', color: '#DC2626' };
  return { text: 'Room split the center', color: '#6B7280' };
}

function RecapCard({ room }: { room: RecapDebate }) {
  const max = Math.max(...room.distribution.bins, 1);
  const landed = landedLabel(room.distribution.median);
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
                { height: 4 + (n / max) * 32, backgroundColor: i === myBin ? '#9A00FF' : '#D8C2F5' },
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

const styles = StyleSheet.create({
  container: {
    paddingTop: 88,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: '#B647FF',
  },
  subtitle: {
    color: '#8D8D8D',
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DCFF',
    backgroundColor: '#F5F2FF',
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
    color: '#8D8D8D',
    fontSize: 13,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  cardCtaText: {
    color: '#B647FF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DCFF',
    backgroundColor: '#F5F2FF',
    padding: 24,
  },
  emptyText: {
    color: '#5A5A5A',
    textAlign: 'center',
    lineHeight: 20,
  },
  recapHeader: {
    fontWeight: '800',
    fontSize: 16,
    color: '#5A5A5A',
    marginTop: 20,
    marginBottom: 2,
  },
  recapCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FAFAFA',
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
    color: '#8D8D8D',
    fontSize: 12,
  },
});
