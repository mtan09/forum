import Article, { ArticleType } from '@/components/articleComponent';
import Post, { PostType } from '@/components/postComponent';
import ScalableImage from '@/components/scalable-image';
import ShareCardModal from '@/components/shareCardModal';
import { LeanShareCard } from '@/components/shareCards';
import Spectrum from '@/components/spectrum';
import SpectrumTrail, { TrailPoint } from '@/components/spectrumTrail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { mapPost } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, selectTick, tapLight } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { onTabRefresh } from '@/lib/tabRefresh';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

// The single computed placement — see the API's /users/me/spectrum:
// scored posts weigh 3× their position, upvotes weigh 1× the content's
// lean, downvotes weigh 1× the mirrored lean.
type SpectrumData = {
  position: number;
  sample: { posts: number; upvotes: number; downvotes: number };
};

function leanLabel(position: number): string {
  if (position < 0.35) return 'Left';
  if (position < 0.45) return 'Lean Left';
  if (position <= 0.55) return 'Center';
  if (position <= 0.65) return 'Lean Right';
  return 'Right';
}

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  post_id: string | null;
  article_id: string | null;
  parent_kind: 'post' | 'article';
  parent_title: string | null;
};

// Upvoted and Saved return posts and articles interleaved
type MixedItem =
  | { kind: 'post'; post: PostType }
  | { kind: 'article'; article: ArticleType };

const TABS = ['Posts', 'Comments', 'Upvoted', 'Saved'] as const;
type Tab = (typeof TABS)[number];

const mapMixed = (rows: any[]): MixedItem[] =>
  rows.map((entry) =>
    entry.kind === 'post'
      ? { kind: 'post' as const, post: mapPost(entry.item) }
      : { kind: 'article' as const, article: entry.item as ArticleType }
  );

function CommentItem({ comment }: { comment: CommentRow }) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const timeAgo = useRelativeTime(comment.created_at);
  const target = comment.parent_kind === 'article'
    ? `/article/${comment.article_id}`
    : `/post/${comment.post_id}`;

  return (
    <Pressable
      onPress={() => router.push(target as any)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
    >
      <ThemedView style={styles.commentRow}>
        <ThemedText style={styles.commentContext} numberOfLines={1}>
          On {comment.parent_kind === 'article' ? 'article' : 'post'}: {comment.parent_title ?? '…'}
        </ThemedText>
        <ThemedText style={styles.commentText} numberOfLines={3}>{comment.content}</ThemedText>
        <ThemedText style={styles.commentMeta}>
          ▲ {comment.upvotes}   ▼ {comment.downvotes}   ·   {timeAgo}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function Profile() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  // profile data comes from the auth session (/users/me)
  const { user: profile, refreshUser } = useAuth();

  // Banner picker: tap the camera on the header image to choose a new
  // banner — uploads and saves immediately (also editable in Edit Profile)
  const [bannerUploading, setBannerUploading] = useState(false);
  const pickBanner = async () => {
    tapLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || bannerUploading) return;
    try {
      setBannerUploading(true);
      const url = await uploadImage(result.assets[0].uri);
      await api('/users/me', { method: 'PATCH', body: { header_url: url } });
      await refreshUser();
      notifySuccess();
    } catch (err: any) {
      Alert.alert('Could not update banner', err?.message ?? 'Please try again.');
    } finally {
      setBannerUploading(false);
    }
  };

  const [spectrum, setSpectrum] = useState<SpectrumData | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number } | null>(null);
  const [unreadDms, setUnreadDms] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('Posts');
  const [myPosts, setMyPosts] = useState<PostType[] | null>(null);
  const [myComments, setMyComments] = useState<CommentRow[] | null>(null);
  const [upvoted, setUpvoted] = useState<MixedItem[] | null>(null);
  const [saved, setSaved] = useState<MixedItem[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const loadTab = useCallback(async (tab: Tab) => {
    setTabLoading(true);
    try {
      if (tab === 'Posts') {
        const rows = await api<any[]>('/users/me/posts');
        setMyPosts(rows.map(mapPost));
      } else if (tab === 'Comments') {
        setMyComments(await api<CommentRow[]>('/users/me/comments'));
      } else if (tab === 'Upvoted') {
        setUpvoted(mapMixed(await api<any[]>('/users/me/upvoted')));
      } else {
        setSaved(mapMixed(await api<any[]>('/bookmarks')));
      }
    } catch (err: any) {
      console.log(`Error loading ${tab}:`, err?.message);
    } finally {
      setTabLoading(false);
    }
  }, []);

  // Recompute the spectrum and refresh the open tab whenever the screen
  // gains focus — activity elsewhere in the app changes both.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<SpectrumData>('/users/me/spectrum')
        .then((data) => { if (active) setSpectrum(data); })
        .catch((err) => console.log('Error fetching spectrum:', err?.message));
      api<{ points: TrailPoint[] }>('/users/me/spectrum/history')
        .then((data) => { if (active) setTrail(data.points ?? []); })
        .catch((err) => console.log('Error fetching spectrum history:', err?.message));
      api<{ unread: number }>('/messages/unread-count')
        .then((data) => { if (active) setUnreadDms(data.unread ?? 0); })
        .catch(() => {});
      if (profile?.id) {
        api<{ follower_count?: number; following_count?: number }>(`/users/${profile.id}`)
          .then((u) => {
            if (active) setFollowCounts({ followers: u.follower_count ?? 0, following: u.following_count ?? 0 });
          })
          .catch(() => {});
      }
      loadTab(activeTab);
      return () => { active = false; };
    }, [activeTab, loadTab, profile?.id])
  );

  // Re-tapping the profile tab button jumps to the top and reloads the open tab
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    return onTabRefresh('profile', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      loadTab(activeTab);
    });
  }, [loadTab, activeTab]);

  const switchTab = (tab: Tab) => {
    selectTick();
    setActiveTab(tab);
    loadTab(tab);
  };

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const totalSignals = spectrum
    ? spectrum.sample.posts + spectrum.sample.upvotes + spectrum.sample.downvotes
    : 0;

  const renderMixed = (items: MixedItem[] | null, emptyText: string) => {
    if (!items) return null;
    if (items.length === 0) return <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>;
    return items.map((entry) =>
      entry.kind === 'post' ? (
        <Pressable
          key={`post-${entry.post.id}`}
          onPress={() => router.push(`/post/${entry.post.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
        >
          <Post post={entry.post} />
        </Pressable>
      ) : (
        <Pressable
          key={`article-${entry.article.id}`}
          onPress={() => router.push(`/article/${entry.article.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
        >
          <Article article={entry.article} />
        </Pressable>
      )
    );
  };

  return (
    <ScrollView ref={scrollRef}>
      <ScalableImage
        source={
          profile?.header_url
            ? { uri: profile.header_url }
            : require('@/assets/images/solid-color-image.png')
        }
        type="width"
        dimension={screenWidth}
        height={200}
      />
      {/* Change the banner right from the profile */}
      <Pressable
        onPress={pickBanner}
        style={({ pressed }) => [styles.bannerButton, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change banner photo"
      >
        {bannerUploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
        )}
      </Pressable>
      {/* Settings moved off the tab bar — the gear lives here now */}
      <Pressable
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <IconSymbol name="gearshape.fill" size={20} color="#FFFFFF" />
      </Pressable>
      {/* DM inbox */}
      <Pressable
        onPress={() => router.push('/messages')}
        style={({ pressed }) => [styles.inboxButton, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Messages"
      >
        <IconSymbol name="envelope.fill" size={18} color="#FFFFFF" />
        {unreadDms > 0 && (
          <ThemedView style={styles.inboxBadge}>
            <ThemedText style={styles.inboxBadgeText}>{unreadDms > 9 ? '9+' : unreadDms}</ThemedText>
          </ThemedView>
        )}
      </Pressable>

      <ThemedView style={styles.container}>
        <ThemedView style={styles.avatarContainer}>
          <Image
            source={
              profile?.avatar_url
                ? { uri: profile.avatar_url }
                : require('@/assets/images/Default_pfp.jpg')
            }
            style={styles.avatar}
          />
        </ThemedView>

        <ThemedText type="defaultSemiBold" style={styles.username}>{profile?.username}</ThemedText>
        {followCounts && (
          <ThemedText style={styles.joinedText}>
            {followCounts.followers} follower{followCounts.followers === 1 ? '' : 's'} · {followCounts.following} following
          </ThemedText>
        )}

        {profile?.bio ? <ThemedText>{profile.bio}</ThemedText> : null}
        {joined && (
          <ThemedView style={styles.joinedRow}>
            <IconSymbol name="calendar" size={14} color={c.muted} />
            <ThemedText style={styles.joinedText}>Joined {joined}</ThemedText>
          </ThemedView>
        )}

        {/* One spectrum, computed — not self-declared */}
        <ThemedView style={styles.spectrumCard}>
          <ThemedView style={styles.spectrumHeader}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>Your Political Lean</ThemedText>
            {spectrum && (
              <ThemedView style={styles.leanBadge}>
                <ThemedText style={styles.leanBadgeText}>{leanLabel(spectrum.position)}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          <Spectrum
            width={screenWidth - 64}
            height={20}
            position={spectrum?.position ?? 0.5}
          />

          {spectrum && (
            totalSignals > 0 ? (
              <ThemedText style={styles.sampleText}>
                Computed from your activity: {spectrum.sample.posts} scored post{spectrum.sample.posts === 1 ? '' : 's'} · {spectrum.sample.upvotes} upvote{spectrum.sample.upvotes === 1 ? '' : 's'} · {spectrum.sample.downvotes} downvote{spectrum.sample.downvotes === 1 ? '' : 's'}
              </ThemedText>
            ) : (
              <ThemedText style={styles.sampleText}>
                No activity yet — post and vote and your placement will form here.
              </ThemedText>
            )
          )}

          {trail.length >= 2 && <SpectrumTrail points={trail} width={screenWidth - 64} />}

          <ThemedText style={styles.methodText}>
            Your posts count 3× toward where they were scored; upvotes pull toward the content&apos;s lean, downvotes pull away from it.
          </ThemedText>

          {spectrum && totalSignals > 0 && (
            <Pressable
              onPress={() => { tapLight(); setShareOpen(true); }}
              style={({ pressed }) => [styles.shareLean, { opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="square.and.arrow.up" size={16} color={c.accent} />
              <ThemedText style={styles.shareLeanText}>Share my lean</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ThemedView>

      {spectrum && (
        <ShareCardModal
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          hint="Save or share your lean card"
        >
          <LeanShareCard
            username={profile?.username ?? 'me'}
            position={spectrum.position}
            label={leanLabel(spectrum.position)}
            sample={
              totalSignals > 0
                ? `From ${spectrum.sample.posts} post${spectrum.sample.posts === 1 ? '' : 's'} and ${spectrum.sample.upvotes + spectrum.sample.downvotes} vote${spectrum.sample.upvotes + spectrum.sample.downvotes === 1 ? '' : 's'}`
                : 'Just getting started'
            }
          />
        </ShareCardModal>
      )}

      {/* Your content — full-width so Post/Article cards line up with the feed */}
      <ThemedView style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable key={tab} onPress={() => switchTab(tab)} style={styles.tabButton}>
            <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </ThemedText>
            {activeTab === tab && <ThemedView style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </ThemedView>

      {tabLoading && (
        <ActivityIndicator style={{ marginVertical: 24 }} color={c.accent} />
      )}

      {!tabLoading && activeTab === 'Posts' && (
        myPosts && myPosts.length === 0
          ? <ThemedText style={styles.emptyText}>You haven&apos;t posted yet.</ThemedText>
          : myPosts?.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => router.push(`/post/${post.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
              >
                <Post post={post} />
              </Pressable>
            ))
      )}

      {!tabLoading && activeTab === 'Comments' && (
        myComments && myComments.length === 0
          ? <ThemedText style={styles.emptyText}>You haven&apos;t commented yet.</ThemedText>
          : myComments?.map((comment) => <CommentItem key={comment.id} comment={comment} />)
      )}

      {!tabLoading && activeTab === 'Upvoted' &&
        renderMixed(upvoted, "Nothing upvoted yet.")}

      {!tabLoading && activeTab === 'Saved' &&
        renderMixed(saved, 'Nothing saved yet — tap the bookmark on any post or article.')}

      <ThemedView style={{ height: 32 }} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxButton: {
    position: 'absolute',
    top: 56,
    right: 62,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  inboxBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  // bottom-right corner of the 200-tall banner
  bannerButton: {
    position: 'absolute',
    top: 152,
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    top: -54,
    left: 8,
    borderRadius: 54,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderColor: c.background,
    borderWidth: 8,
  },
  username: {
    marginTop: 48,
    fontWeight: '800',
    fontSize: 24,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinedText: {
    color: c.muted,
    fontSize: 13,
  },
  spectrumCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 16,
    gap: 10,
  },
  spectrumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  leanBadge: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  leanBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16,
  },
  sampleText: {
    color: c.subtle,
    fontSize: 13,
    lineHeight: 18,
  },
  methodText: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  shareLean: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.cardBorder,
  },
  shareLeanText: {
    color: c.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: c.muted,
  },
  tabLabelActive: {
    color: c.accent,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '60%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: c.accent,
  },
  emptyText: {
    textAlign: 'center',
    color: c.muted,
    marginVertical: 24,
    paddingHorizontal: 32,
  },
  commentRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 4,
  },
  commentContext: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 21,
  },
  commentMeta: {
    color: c.muted,
    fontSize: 13,
  },
});
