import AvatarVisual from '@/components/avatar-visual';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapLight } from '@/lib/haptics';
import type { DailyBrief, DailyBriefActivity } from '@/types/daily-brief';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const ACTIVITY: {
  key: keyof DailyBriefActivity | 'all_upvotes';
  label: string;
  icon: Parameters<typeof IconSymbol>[0]['name'];
}[] = [
  { key: 'replies', label: 'Replies', icon: 'bubble' },
  { key: 'comments', label: 'Comments on your posts', icon: 'message.fill' },
  { key: 'all_upvotes', label: 'New upvotes', icon: 'arrowshape.up.fill' },
  { key: 'reposts', label: 'Reposts', icon: 'arrow.2.squarepath' },
  { key: 'quotes', label: 'Quotes', icon: 'quote.bubble' },
  { key: 'followers', label: 'New followers', icon: 'person.2.fill' },
  { key: 'follow_requests', label: 'Follow requests', icon: 'person.fill' },
  { key: 'unread_dms', label: 'Unread messages', icon: 'envelope.fill' },
];

const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function DailyBriefScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [archive, setArchive] = useState<DailyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api<DailyBrief>(`/briefs/${encodeURIComponent(date)}`),
      api<DailyBrief[]>('/briefs?limit=7'),
    ]).then(([selected, editions]) => {
      if (!mounted) return;
      setBrief(selected);
      setArchive(editions);
    }).catch(() => {
      if (mounted) setBrief(null);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [date]);

  useEffect(() => {
    if (!brief || markedRef.current === brief.id) return;
    markedRef.current = brief.id;
    api(`/briefs/${brief.id}/seen`, { body: {} }).catch(() => {});
  }, [brief]);

  const activityCount = (key: (typeof ACTIVITY)[number]['key']) => key === 'all_upvotes'
    ? (brief?.activity.post_upvotes ?? 0) + (brief?.activity.comment_upvotes ?? 0)
    : Number(brief?.activity[key] ?? 0);

  const activityRoute = (key: (typeof ACTIVITY)[number]['key']) => {
    if (key === 'unread_dms') return '/messages';
    if (key === 'follow_requests') return '/follow-requests';
    if (key === 'followers' && user?.id) return `/connections/${user.id}?tab=followers`;
    return '/profile';
  };

  const sheet = (
    <ThemedView style={styles.sheet}>
      <View style={styles.grabber} />
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.eyebrow}>forum</ThemedText>
          <ThemedText style={styles.title}>Daily Brief</ThemedText>
          {brief && <ThemedText style={styles.date}>{displayDate(brief.brief_date)}</ThemedText>}
        </View>
        <Pressable
          onPress={() => { tapLight(); router.back(); }}
          accessibilityLabel="Close Daily Brief"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <IconSymbol name="xmark" size={20} color={c.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={c.muted} /></View>
      ) : !brief ? (
        <View style={styles.loading}>
          <ThemedText style={styles.emptyTitle}>This brief is no longer available</ThemedText>
          <ThemedText style={styles.muted}>Daily Brief editions remain available for seven days.</ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {archive.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.archive}>
              {archive.map((edition) => {
                const active = edition.brief_date === brief.brief_date;
                return (
                  <Pressable
                    key={edition.id}
                    onPress={() => { tapLight(); router.replace(`/brief/${edition.brief_date}` as never); }}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                  >
                    <ThemedText style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                      {new Date(`${edition.brief_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {brief.stories.length > 0 && (
            <Section title="Across forum" subtitle="The stories driving today’s conversation">
              {brief.stories.map((story, index) => (
                <Pressable
                  key={story.id}
                  onPress={() => { tapLight(); router.push(`/summary/${story.id}` as never); }}
                  style={({ pressed }) => [styles.storyCard, pressed && styles.pressed]}
                >
                  <View style={styles.storyCopy}>
                    <ThemedText style={styles.rank}>{String(index + 1).padStart(2, '0')}</ThemedText>
                    <ThemedText style={styles.cardTitle}>{story.title}</ThemedText>
                    <ThemedText style={styles.meta}>{countLabel(story.outlet_count, 'outlet')} · {countLabel(story.article_count, 'article')}</ThemedText>
                  </View>
                  {story.media ? <Image source={{ uri: story.media }} style={styles.storyImage} contentFit="cover" /> : null}
                </Pressable>
              ))}
            </Section>
          )}

          {brief.posts.length > 0 && (
            <Section title="Worth hearing" subtitle="Posts selected for your interests">
              {brief.posts.map((post) => (
                <Pressable
                  key={post.id}
                  onPress={() => { tapLight(); router.push(`/post/${post.id}` as never); }}
                  style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
                >
                  <AvatarVisual userId={post.user_id} avatarUrl={post.avatar_url} isDemo={post.is_demo} size={38} />
                  <View style={styles.postBody}>
                    <ThemedText style={styles.postName}>{post.username}{post.is_demo ? ' (Fictional demo account)' : ''}</ThemedText>
                    <ThemedText style={styles.postText} numberOfLines={4}>{post.content}</ThemedText>
                    <ThemedText style={styles.meta}>{countLabel(post.upvotes, 'upvote')} · {countLabel(post.commentcount, 'comment')}</ThemedText>
                  </View>
                </Pressable>
              ))}
            </Section>
          )}

          {brief.floor.length > 0 && (
            <Section title="On The Floor" subtitle="Where the community is taking a position">
              {brief.floor.map((room) => (
                <Pressable
                  key={room.id}
                  onPress={() => { tapLight(); router.push(`/debate/${room.id}` as never); }}
                  style={({ pressed }) => [styles.floorCard, pressed && styles.pressed]}
                >
                  <IconSymbol name="bubble.left.and.bubble.right.fill" size={22} color={c.primary} />
                  <View style={styles.floorBody}>
                    <ThemedText style={styles.cardTitle}>{room.title}</ThemedText>
                    <ThemedText style={styles.meta}>{countLabel(room.total_votes, 'position')} · {countLabel(room.comment_count, 'comment')}</ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={17} color={c.faint} />
                </Pressable>
              ))}
              {brief.floor_recap[0] ? (
                <Pressable
                  onPress={() => { tapLight(); router.push(`/debate/${brief.floor_recap[0].id}` as never); }}
                  style={({ pressed }) => [styles.recap, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.recapLabel}>Yesterday’s Floor</ThemedText>
                  <ThemedText style={styles.recapTitle}>{brief.floor_recap[0].title}</ThemedText>
                </Pressable>
              ) : null}
            </Section>
          )}

          {ACTIVITY.some(({ key }) => activityCount(key) > 0) && (
            <Section title="Around you" subtitle="Meaningful activity since yesterday’s brief">
              <View style={styles.activityGrid}>
                {ACTIVITY.filter(({ key }) => activityCount(key) > 0).map(({ key, label, icon }) => (
                  <Pressable
                    key={key}
                    onPress={() => { tapLight(); router.push(activityRoute(key) as never); }}
                    style={({ pressed }) => [styles.activityCard, pressed && styles.pressed]}
                  >
                    <IconSymbol name={icon} size={19} color={c.primary} />
                    <ThemedText style={styles.activityCount}>{activityCount(key)}</ThemedText>
                    <ThemedText style={styles.activityLabel}>{label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </Section>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );

  if (Platform.OS !== 'web') return sheet;
  return (
    <View style={styles.webOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      {sheet}
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.section}>
      <ThemedText style={sectionStyles.title}>{title}</ThemedText>
      <ThemedText style={sectionStyles.subtitle}>{subtitle}</ThemedText>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: { gap: 2 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 18, opacity: 0.58 },
  body: { gap: 10, marginTop: 10 },
});

const makeStyles = (c: Palette) => StyleSheet.create({
  webOverlay: { position: 'absolute', inset: 0, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  sheet: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 720 : undefined, maxHeight: Platform.OS === 'web' ? '90%' : undefined, borderRadius: Platform.OS === 'web' ? 24 : 0, overflow: 'hidden', backgroundColor: c.surfaceRaised },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 9 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 13, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  eyebrow: { color: c.primary, fontSize: 15, lineHeight: 18, fontWeight: '900' },
  title: { fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  date: { color: c.muted, fontSize: 13, lineHeight: 18 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 40, gap: 28 },
  loading: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  muted: { color: c.muted, textAlign: 'center' },
  archive: { gap: 8, paddingBottom: 2 },
  dateChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: c.surfaceMuted },
  dateChipActive: { backgroundColor: c.primary },
  dateChipText: { fontSize: 13, lineHeight: 17, color: c.muted, fontWeight: '700' },
  dateChipTextActive: { color: c.onPrimary },
  storyCard: { flexDirection: 'row', overflow: 'hidden', borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
  storyCopy: { flex: 1, padding: 14, gap: 5 },
  rank: { color: c.primary, fontSize: 12, lineHeight: 15, fontWeight: '900' },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  meta: { color: c.muted, fontSize: 12, lineHeight: 16 },
  storyImage: { width: 112, minHeight: 112, backgroundColor: c.surfaceMuted },
  postCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.surfaceMuted },
  postBody: { flex: 1, gap: 3 },
  postName: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  postText: { fontSize: 15, lineHeight: 21 },
  floorCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
  floorBody: { flex: 1, gap: 3 },
  recap: { borderRadius: 14, padding: 13, backgroundColor: c.surfaceMuted, gap: 2 },
  recapLabel: { color: c.primary, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  recapTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  activityCard: { width: '48%', minHeight: 100, borderRadius: 15, padding: 13, backgroundColor: c.surfaceMuted, justifyContent: 'space-between' },
  activityCount: { fontSize: 25, lineHeight: 28, fontWeight: '900' },
  activityLabel: { color: c.muted, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
