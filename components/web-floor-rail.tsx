import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tapLight } from '@/lib/haptics';

type Debate = {
  id: string;
  kind: 'biggest' | 'contested' | 'trending';
  title: string;
  total_votes: number;
  comment_count: number;
  my_position: number | null;
};

const metaFor = (kind: Debate['kind'], c: Palette) => {
  if (kind === 'contested') return { label: 'Most divided', color: c.red, background: c.redBg };
  if (kind === 'trending') return { label: 'Trending', color: c.amber, background: c.amberBg };
  return { label: 'Biggest story', color: c.accentDeep, background: c.accentSoftBg };
};

export default function WebFloorRail({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [debates, setDebates] = useState<Debate[] | null>(null);

  useEffect(() => {
    let active = true;
    api<Debate[]>('/debates')
      .then((rows) => { if (active) setDebates(rows); })
      .catch((error) => {
        console.warn('[web] The Floor could not load:', error?.message);
        if (active) setDebates([]);
      });
    return () => { active = false; };
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <ThemedView style={[styles.rail, compact && styles.railCompact]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View>
            <ThemedText style={styles.eyebrow}>LIVE DISCUSSION</ThemedText>
            <ThemedText style={styles.title}>The Floor</ThemedText>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>Today</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.date}>{today} · take a stance alongside the feed</ThemedText>

        {debates === null ? (
          <ActivityIndicator style={styles.loader} color={c.muted} />
        ) : debates.length === 0 ? (
          <ThemedView style={styles.empty}>
            <ThemedText style={styles.emptyText}>Today’s rooms will appear when enough stories cluster.</ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.rooms}>
            {debates.slice(0, 2).map((debate) => {
              const meta = metaFor(debate.kind, c);
              const joined = debate.my_position != null;
              return (
                <Pressable
                  key={debate.id}
                  onPress={() => { tapLight(); router.push(`/debate/${debate.id}`); }}
                  style={({ pressed }) => [styles.room, pressed && styles.pressed]}
                  accessibilityRole="link"
                >
                  <View style={[styles.kind, { backgroundColor: meta.background }]}>
                    <ThemedText style={[styles.kindText, { color: meta.color }]}>{meta.label}</ThemedText>
                  </View>
                  <ThemedText numberOfLines={4} style={styles.roomTitle}>{debate.title}</ThemedText>
                  <View style={styles.roomFooter}>
                    <ThemedText style={styles.stats}>
                      {debate.total_votes} voice{debate.total_votes === 1 ? '' : 's'} · {debate.comment_count} replies
                    </ThemedText>
                    <IconSymbol
                      name={joined ? 'checkmark.circle.fill' : 'chevron.right'}
                      size={16}
                      color={joined ? c.success : c.primary}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => { tapLight(); router.push('/debate'); }}
          style={({ pressed }) => [styles.allRooms, pressed && styles.pressed]}
        >
          <ThemedText style={styles.allRoomsText}>Open The Floor</ThemedText>
          <IconSymbol name="chevron.right" size={17} color={c.primary} />
        </Pressable>

        <ThemedView style={styles.contextCard}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={20} color={c.primary} />
          <ThemedText style={styles.contextTitle}>Read, then weigh in</ThemedText>
          <ThemedText style={styles.contextText}>
            The Floor stays beside the mixed feed so discussion remains connected to the coverage shaping it.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  rail: {
    width: 296,
    flexShrink: 0,
    alignSelf: 'stretch',
    marginVertical: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  railCompact: {
    width: 258,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: c.primary,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: c.primary,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    backgroundColor: c.accentSoftBg,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  liveText: {
    color: c.accentDeep,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  date: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  loader: {
    marginVertical: 32,
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 18,
  },
  emptyText: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  rooms: {
    gap: 10,
  },
  room: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 14,
    gap: 10,
  },
  kind: {
    alignSelf: 'flex-start',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kindText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  roomTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: {
    color: c.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  allRooms: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer',
  },
  allRoomsText: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  contextCard: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: c.surface,
    padding: 15,
    gap: 6,
  },
  contextTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  contextText: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.65,
  },
});
