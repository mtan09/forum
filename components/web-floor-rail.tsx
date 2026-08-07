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
        {/* One panel listing every open room, in the shape of a trending list:
            compact rows split by hairlines rather than a stack of loose cards,
            so the rail can show all of them without running off the screen. */}
        <ThemedView style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeading}>
              <ThemedText style={styles.eyebrow}>LIVE DISCUSSION</ThemedText>
              <ThemedText style={styles.title}>The Floor</ThemedText>
              <ThemedText style={styles.date}>{today}</ThemedText>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>Today</ThemedText>
            </View>
          </View>

          {debates === null ? (
            <ActivityIndicator style={styles.loader} color={c.muted} />
          ) : debates.length === 0 ? (
            <ThemedView style={styles.empty}>
              <ThemedText style={styles.emptyText}>Today’s rooms will appear when enough stories cluster.</ThemedText>
            </ThemedView>
          ) : (
            debates.map((debate) => {
              const meta = metaFor(debate.kind, c);
              const joined = debate.my_position != null;
              return (
                <Pressable
                  key={debate.id}
                  onPress={() => { tapLight(); router.push(`/debate/${debate.id}`); }}
                  style={({ pressed }) => [styles.room, pressed && styles.pressed]}
                  accessibilityRole="link"
                >
                  <View style={styles.roomTop}>
                    <ThemedText style={[styles.kindText, { color: meta.color }]}>{meta.label}</ThemedText>
                    {joined && <IconSymbol name="checkmark.circle.fill" size={13} color={c.success} />}
                  </View>
                  <ThemedText numberOfLines={2} style={styles.roomTitle}>{debate.title}</ThemedText>
                  <ThemedText style={styles.stats}>
                    {debate.total_votes} voice{debate.total_votes === 1 ? '' : 's'} · {debate.comment_count} replies
                  </ThemedText>
                </Pressable>
              );
            })
          )}

          <Pressable
            onPress={() => { tapLight(); router.push('/debate'); }}
            style={({ pressed }) => [styles.allRooms, pressed && styles.pressed]}
          >
            <ThemedText style={styles.allRoomsText}>Open The Floor</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  // A flush column, not a floating rounded panel — the feed's right hairline
  // is the only separator it needs.
  rail: {
    width: 316,
    flexShrink: 0,
    alignSelf: 'stretch',
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
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 12,
  },
  panelHeading: {
    flex: 1,
    minWidth: 0,
  },
  room: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    cursor: 'pointer',
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  kindText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  roomTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  stats: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  // A flush footer row of the panel, like the "show more" that closes a
  // trending list — not a separate bordered button floating beneath it.
  allRooms: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    cursor: 'pointer',
  },
  allRoomsText: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.65,
  },
});
