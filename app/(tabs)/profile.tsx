import Article, { ArticleType } from '@/components/articleComponent';
import AvatarVisual from '@/components/avatar-visual';
import DisplayName from '@/components/display-name';
import ContentActions from '@/components/contentActions';
import ContentLongPress from '@/components/content-long-press';
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
import { useContentInteraction, useInteractionController, useInteractionRevision } from '@/context/interactionContext';
import { mapPost } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, selectTick, tapLight } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { onTabRefresh } from '@/lib/tabRefresh';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import type { DailyBrief } from '@/types/daily-brief';

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
  parent_comment_id?: string | null;
  reply_count?: number;
};

// Upvoted, Reposts and Saved return posts and articles interleaved
type MixedItem =
  | { kind: 'post'; post: PostType }
  | { kind: 'article'; article: ArticleType };

const TABS = ['Posts', 'Comments', 'Upvoted', 'Reposts', 'Saved'] as const;

// These lists render unvirtualized inside the profile's ScrollView, so they
// arrive a page at a time. Loading every row at once locked the UI for
// seconds on accounts with a long upvote history.
const PROFILE_PAGE_SIZE = 30;
// Start fetching the next page while this much content is still below.
const LOAD_MORE_THRESHOLD_PX = 900;
type Tab = (typeof TABS)[number];

const mapMixed = (rows: any[]): MixedItem[] =>
  rows.map((entry) =>
    entry.kind === 'post'
      ? { kind: 'post' as const, post: mapPost(entry.item) }
      : { kind: 'article' as const, article: entry.item as ArticleType }
  );

function CommentItem({ comment }: { comment: CommentRow }) {
  const router = useRouter();
  const { user } = useAuth();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const timeAgo = useRelativeTime(comment.created_at);
  const interactionController = useInteractionController();
  const { state: votes, patch } = useContentInteraction('comment', comment.id, {
    upvotes: comment.upvotes ?? 0,
    downvotes: comment.downvotes ?? 0,
    replyCount: comment.reply_count ?? 0,
    deleted: false,
  });
  const target = comment.parent_kind === 'article'
    ? `/article/${comment.article_id}`
    : `/post/${comment.post_id}`;

  const handleDeleted = (result: { removed_comment_count?: number; post_id?: string | null; article_id?: string | null; parent_comment_id?: string | null }) => {
    const removed = Math.max(1, result.removed_comment_count ?? 1);
    patch({ deleted: true });
    if (result.parent_comment_id) {
      interactionController.update('comment', result.parent_comment_id, (current) => ({
        replyCount: Math.max(0, (current.replyCount ?? 1) - 1),
      }));
    }
    const kind = result.post_id ? 'post' : result.article_id ? 'article' : null;
    const id = result.post_id ?? result.article_id;
    if (kind && id) {
      interactionController.update(kind, id, (current) => ({
        commentCount: Math.max(0, (current.commentCount ?? removed) - removed),
      }));
    }
  };

  if (votes.deleted) return null;

  return (
    <ContentLongPress
      preview={{
        kind: 'comment',
        id: comment.id,
        authorId: user?.id ?? '',
        authorName: user?.username ?? 'You',
        authorAvatar: user?.avatar_url,
        authorIsDemo: user?.is_demo,
        text: comment.content,
      }}
      onDeleted={handleDeleted}
    >
    <Pressable
      onPress={() => router.push(target as any)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
    >
      <ThemedView style={styles.commentRow}>
        <ThemedView style={styles.commentContextRow}>
          <ThemedText style={styles.commentContext} numberOfLines={1}>
            On {comment.parent_kind === 'article' ? 'article' : 'post'}: {comment.parent_title ?? '…'}
          </ThemedText>
          {!!user?.id && (
            <ContentActions
              targetKind="comment"
              targetId={comment.id}
              authorId={user.id}
              authorName={user.username}
              onDeleted={handleDeleted}
            />
          )}
        </ThemedView>
        <ThemedText style={styles.commentText} numberOfLines={3}>{comment.content}</ThemedText>
        <ThemedView style={styles.commentMetaRow}>
          <ThemedView style={styles.commentMetaItem}>
            <IconSymbol name="arrowshape.up" size={14} color={c.muted} />
            <ThemedText style={styles.commentMeta}>{votes.upvotes ?? 0}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.commentMetaItem}>
            <IconSymbol name="arrowshape.down" size={14} color={c.muted} />
            <ThemedText style={styles.commentMeta}>{votes.downvotes ?? 0}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.commentMetaItem}>
            <IconSymbol name="bubble" size={14} color={c.muted} />
            <ThemedText style={styles.commentMeta}>{votes.replyCount ?? 0}</ThemedText>
          </ThemedView>
          <ThemedText style={styles.commentMetaTime}>{timeAgo}</ThemedText>
        </ThemedView>
      </ThemedView>
    </Pressable>
    </ContentLongPress>
  );
}

export default function Profile() {
  const { width: windowWidth } = useWindowDimensions();
  const profileWidth = Platform.OS === 'web' && windowWidth >= 1280
    ? Math.max(1, Math.min(windowWidth - 294, 940))
    : windowWidth;
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  // profile data comes from the auth session (/users/me)
  const { user: profile, refreshUser } = useAuth();
  const [headerFailed, setHeaderFailed] = useState(false);

  useEffect(() => {
    setHeaderFailed(false);
  }, [profile?.header_url]);
  const interactionController = useInteractionController();
  const interactionRevision = useInteractionRevision();

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
  const [latestBrief, setLatestBrief] = useState<DailyBrief | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [spectrumWidth, setSpectrumWidth] = useState(0);

  const [activeTab, setActiveTab] = useState<Tab>('Posts');
  const [myPosts, setMyPosts] = useState<PostType[] | null>(null);
  const [myComments, setMyComments] = useState<CommentRow[] | null>(null);
  const [upvoted, setUpvoted] = useState<MixedItem[] | null>(null);
  const [reposts, setReposts] = useState<MixedItem[] | null>(null);
  const [saved, setSaved] = useState<MixedItem[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState<Partial<Record<Tab, boolean>>>({});
  const loadedTabsRef = useRef<Set<Tab>>(new Set());
  const loadingMoreRef = useRef(false);
  // Row counts drive the next page's offset, so they must stay in step with
  // the state setters below rather than being derived at render time.
  const countsRef = useRef<Partial<Record<Tab, number>>>({});

  const loadTab = useCallback(async (
    tab: Tab,
    {
      showLoading = !loadedTabsRef.current.has(tab),
      append = false,
    }: { showLoading?: boolean; append?: boolean } = {}
  ): Promise<boolean> => {
    if (append && loadingMoreRef.current) return false;
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    if (showLoading) setTabLoading(true);
    const offset = append ? countsRef.current[tab] ?? 0 : 0;
    const paging = `limit=${PROFILE_PAGE_SIZE}&offset=${offset}`;
    const grow = <T,>(previous: T[] | null, next: T[]): T[] =>
      append && previous ? [...previous, ...next] : next;
    try {
      let received = 0;
      if (tab === 'Posts') {
        const rows = await api<any[]>(`/users/me/posts?${paging}`);
        received = rows.length;
        setMyPosts((previous) => grow(previous, rows.map(mapPost)));
      } else if (tab === 'Comments') {
        const rows = await api<CommentRow[]>(`/users/me/comments?${paging}`);
        received = rows.length;
        setMyComments((previous) => grow(previous, rows));
      } else if (tab === 'Upvoted') {
        const rows = await api<any[]>(`/users/me/upvoted?${paging}`);
        received = rows.length;
        setUpvoted((previous) => grow(previous, mapMixed(rows)));
      } else if (tab === 'Reposts') {
        const rows = await api<any[]>(`/users/me/reposts?${paging}`);
        received = rows.length;
        setReposts((previous) => grow(previous, mapMixed(rows)));
      } else {
        const rows = await api<any[]>(`/bookmarks?${paging}`);
        received = rows.length;
        setSaved((previous) => grow(previous, mapMixed(rows)));
      }
      countsRef.current[tab] = offset + received;
      setHasMore((current) => ({ ...current, [tab]: received === PROFILE_PAGE_SIZE }));
      loadedTabsRef.current.add(tab);
      return true;
    } catch (err: any) {
      console.log(`Error loading ${tab}:`, err?.message);
      return false;
    } finally {
      if (showLoading) setTabLoading(false);
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, []);

  const activeTabRef = useRef<Tab>(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

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
      api<DailyBrief[]>('/briefs?limit=1')
        .then((items) => { if (active) setLatestBrief(items[0] ?? null); })
        .catch(() => {});
      if (profile?.id) {
        api<{ follower_count?: number; following_count?: number }>(`/users/${profile.id}`)
          .then((u) => {
            if (active) setFollowCounts({ followers: u.follower_count ?? 0, following: u.following_count ?? 0 });
          })
          .catch(() => {});
      }
      loadTab(activeTabRef.current);
      return () => { active = false; };
    }, [loadTab, profile?.id])
  );

  // Re-tapping the profile tab button jumps to the top and reloads the open tab
  const scrollRef = useRef<ScrollView>(null);
  const currentOffsetRef = useRef(0);

  // Reserving a viewport's worth of space below the tab bar means the bar can
  // always scroll to the top of the screen. Without it, moving from a long tab
  // to a short one shrinks the page and iOS clamps the offset — which reads as
  // the screen jumping even though nothing scrolled it.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const tabContentMinHeight = Math.max(0, viewportHeight - tabBarHeight);

  // Switching tabs deliberately does not scroll. Each tab used to restore its
  // own remembered offset, which threw the page to a different position on
  // every switch; keeping the offset untouched leaves the tab bar exactly
  // where the user left it.

  useEffect(() => {
    return onTabRefresh('profile', () => {
      currentOffsetRef.current = 0;
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      loadTab(activeTab);
    });
  }, [loadTab, activeTab]);

  // The tab switches immediately and the content area shows its own spinner
  // while the first page arrives. Awaiting the fetch before switching left the
  // whole bar unresponsive for the length of a request — around a second — with
  // no feedback, which read as a frozen button rather than a load.
  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    selectTick();
    activeTabRef.current = tab;
    setActiveTab(tab);

    if (!loadedTabsRef.current.has(tab)) {
      loadTab(tab).catch(() => {
        // loadTab already logs; a failed tab keeps its empty state.
      });
    }
  };

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const openDailyBrief = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
      const today = await api<{ ready: boolean; brief: DailyBrief | null }>(
        `/briefs/today?timezone=${encodeURIComponent(timezone)}`
      );
      const selected = today.brief ?? latestBrief;
      if (!selected) {
        Alert.alert('Daily Brief', 'Your first morning brief will be ready at 7:00 AM.');
        return;
      }
      router.push(`/brief/${selected.brief_date}` as never);
    } catch (error: any) {
      Alert.alert('Could not open Daily Brief', error?.message ?? 'Please try again.');
    }
  };

  const totalSignals = spectrum
    ? spectrum.sample.posts + spectrum.sample.upvotes + spectrum.sample.downvotes
    : 0;

  const renderMixed = (items: MixedItem[] | null, emptyText: string) => {
    if (!items) return null;
    // The revision subscription makes removals from Upvoted/Reposts/Saved
    // immediate, including when the action happened on another screen.
    void interactionRevision;
    const stillBelongs = (state: { myVote?: string | null; bookmarked?: boolean; reposted?: boolean }) => {
      if (activeTab === 'Upvoted') return state.myVote === 'up';
      if (activeTab === 'Reposts') return state.reposted === true;
      return state.bookmarked === true;
    };
    const visibleItems = items.filter((entry) => {
      if (entry.kind === 'post') {
        return stillBelongs(interactionController.get('post', entry.post.id, {
          myVote: entry.post.myVote ?? null,
          bookmarked: entry.post.myBookmark ?? false,
          reposted: entry.post.myRepost ?? false,
        }));
      }
      return stillBelongs(interactionController.get('article', entry.article.id, {
        myVote: entry.article.my_vote ?? null,
        bookmarked: entry.article.my_bookmark ?? false,
        reposted: entry.article.my_repost ?? false,
      }));
    });
    if (visibleItems.length === 0) return <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>;
    return visibleItems.map((entry) =>
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
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const y = contentOffset.y;
        currentOffsetRef.current = y;

        const remaining = contentSize.height - layoutMeasurement.height - y;
        if (remaining > LOAD_MORE_THRESHOLD_PX) return;
        const tab = activeTabRef.current;
        if (tabLoading || loadingMoreRef.current || !hasMore[tab]) return;
        loadTab(tab, { showLoading: false, append: true });
      }}
    >
      <ScalableImage
        source={
          profile?.header_url && !headerFailed
            ? { uri: profile.header_url }
            : require('@/assets/images/solid-color-image.png')
        }
        type="width"
        dimension={profileWidth}
        height={200}
        onError={() => setHeaderFailed(true)}
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
          <ActivityIndicator size="small" color={c.onImage} />
        ) : (
          <IconSymbol name="camera.fill" size={18} color={c.onImage} />
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
        <IconSymbol name="gearshape.fill" size={20} color={c.onImage} />
      </Pressable>
      {/* DM inbox */}
      <Pressable
        onPress={() => router.push('/messages')}
        style={({ pressed }) => [styles.inboxButton, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Messages"
      >
        <IconSymbol name="envelope.fill" size={18} color={c.onImage} />
        {unreadDms > 0 && (
          <ThemedView style={styles.inboxBadge}>
            <ThemedText style={styles.inboxBadgeText}>{unreadDms > 9 ? '9+' : unreadDms}</ThemedText>
          </ThemedView>
        )}
      </Pressable>

      <ThemedView style={styles.container}>
        <ThemedView style={styles.avatarContainer}>
          <AvatarVisual
            userId={profile?.id ?? 'me'}
            avatarUrl={profile?.avatar_url}
            isDemo={profile?.is_demo}
            size={108}
            style={styles.avatar}
          />
        </ThemedView>

        <DisplayName username={profile?.username} isDemo={profile?.is_demo} nameStyle={styles.username} />
        {followCounts && profile?.id ? (
          <ThemedView style={styles.followCountsRow}>
            <Pressable
              onPress={() => router.push({ pathname: '/connections/[userId]', params: { userId: profile.id, tab: 'followers' } })}
              style={({ pressed }) => [styles.countButton, pressed && styles.countPressed]}
            >
              <ThemedText style={styles.followCountNumber}>{followCounts.followers}</ThemedText>
              <ThemedText style={styles.followCountLabel}>follower{followCounts.followers === 1 ? '' : 's'}</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/connections/[userId]', params: { userId: profile.id, tab: 'following' } })}
              style={({ pressed }) => [styles.countButton, pressed && styles.countPressed]}
            >
              <ThemedText style={styles.followCountNumber}>{followCounts.following}</ThemedText>
              <ThemedText style={styles.followCountLabel}>following</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        <Pressable
          onPress={() => { tapLight(); router.push('/following'); }}
          style={({ pressed }) => [styles.followingFeedButton, { opacity: pressed ? 0.65 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open posts from people you follow"
        >
          <ThemedView style={styles.followingFeedLeft}>
            <ThemedView style={styles.followingFeedIcon}>
              <IconSymbol name="person.2.fill" size={17} color={c.primary} />
            </ThemedView>
            <ThemedView style={styles.followingFeedCopy}>
              <ThemedText style={styles.followingFeedTitle}>Following feed</ThemedText>
              <ThemedText style={styles.followingFeedSubtitle}>Posts from people you chose</ThemedText>
            </ThemedView>
          </ThemedView>
          <IconSymbol name="chevron.right" size={17} color={c.faint} />
        </Pressable>

        <Pressable
          onPress={() => { tapLight(); void openDailyBrief(); }}
          style={({ pressed }) => [styles.followingFeedButton, { opacity: pressed ? 0.65 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open Daily Brief"
        >
          <ThemedView style={styles.followingFeedLeft}>
            <ThemedView style={styles.followingFeedIcon}>
              <IconSymbol name="newspaper.fill" size={17} color={c.primary} />
              {latestBrief && !latestBrief.seen_at ? <ThemedView style={styles.briefUnreadDot} /> : null}
            </ThemedView>
            <ThemedView style={styles.followingFeedCopy}>
              <ThemedText style={styles.followingFeedTitle}>Daily Brief</ThemedText>
              <ThemedText style={styles.followingFeedSubtitle}>Stories, The Floor, and activity around you</ThemedText>
            </ThemedView>
          </ThemedView>
          <IconSymbol name="chevron.right" size={17} color={c.faint} />
        </Pressable>

        {profile?.bio ? <ThemedText>{profile.bio}</ThemedText> : null}
        {joined && (
          <ThemedView style={styles.joinedRow}>
            <IconSymbol name="calendar" size={14} color={c.muted} />
            <ThemedText style={styles.joinedText}>Joined {joined}</ThemedText>
          </ThemedView>
        )}

        {/* One spectrum, computed — not self-declared */}
        <ThemedView
          style={styles.spectrumCard}
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.width - 32);
            if (next > 0 && next !== spectrumWidth) setSpectrumWidth(next);
          }}
        >
          <ThemedView style={styles.spectrumHeader}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>Your Political Lean</ThemedText>
            {spectrum && (
              <ThemedView style={styles.leanBadge}>
                <ThemedText style={styles.leanBadgeText}>{leanLabel(spectrum.position)}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          <Spectrum
            width={Math.max(1, spectrumWidth || profileWidth - (Platform.OS === 'web' ? 128 : 64))}
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

          {trail.length >= 2 && (
            <SpectrumTrail
              points={trail}
              width={Math.max(1, spectrumWidth || profileWidth - (Platform.OS === 'web' ? 128 : 64))}
            />
          )}

          <ThemedText style={styles.methodText}>
            Your posts count 3× toward where they were scored; upvotes pull toward the content&apos;s lean, downvotes pull away from it.
          </ThemedText>

          {spectrum && totalSignals > 0 && (
            <Pressable
              onPress={() => { tapLight(); setShareOpen(true); }}
              style={({ pressed }) => [styles.shareLean, { opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="square.and.arrow.up" size={16} color={c.primary} />
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
      <ThemedView
        style={styles.tabBar}
        onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
      >
        {TABS.map((tab) => (
          <Pressable key={tab} onPress={() => switchTab(tab)} style={styles.tabButton}>
            {/* Five tabs leave ~75pt each on the smallest supported iPhone, so
                keep long labels on one line rather than letting them wrap. */}
            <ThemedText
              numberOfLines={1}
              style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}
            >
              {tab}
            </ThemedText>
            {activeTab === tab && <ThemedView style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </ThemedView>

      <ThemedView style={{ minHeight: tabContentMinHeight }}>
      {tabLoading && (
        <ActivityIndicator style={{ marginVertical: 24 }} color={c.primary} />
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

      {!tabLoading && activeTab === 'Reposts' &&
        renderMixed(reposts, 'Nothing reposted yet — tap the repost icon on any post or article.')}

      {!tabLoading && activeTab === 'Saved' &&
        renderMixed(saved, 'Nothing saved yet — tap the bookmark on any post or article.')}

      {loadingMore && <ActivityIndicator style={styles.footerLoader} color={c.muted} />}
      </ThemedView>

      <ThemedView style={{ height: 32 }} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: 12,
    marginHorizontal: Platform.OS === 'web' ? 24 : 0,
    marginTop: Platform.OS === 'web' ? -18 : 0,
    borderRadius: Platform.OS === 'web' ? 22 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.border,
    backgroundColor: Platform.OS === 'web' ? c.surfaceRaised : c.background,
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.imageControlBg,
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
    backgroundColor: c.imageControlBg,
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
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  inboxBadgeText: {
    color: c.onPrimary,
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
    backgroundColor: c.imageControlBg,
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
    backgroundColor: 'transparent',
  },
  joinedText: {
    color: c.muted,
    fontSize: 13,
  },
  followCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'transparent',
  },
  countButton: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  followCountNumber: { color: c.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  followCountLabel: { color: c.muted, fontSize: 13, lineHeight: 18 },
  countPressed: { opacity: 0.55 },
  followingFeedButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  followingFeedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  followingFeedIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoftBg,
  },
  briefUnreadDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.primary,
    borderWidth: 1,
    borderColor: c.card,
  },
  followingFeedCopy: {
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
  followingFeedTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  followingFeedSubtitle: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
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
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  leanBadgeText: {
    color: c.onPrimary,
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
    color: c.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 24,
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
    color: c.primary,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '60%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: c.primary,
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
  commentContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentContext: {
    flex: 1,
    color: c.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 21,
  },
  // Icons and gap spacing rather than glyphs padded with literal spaces, so the
  // row lines up with the vote rows on posts and comments elsewhere.
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  // Icon and its count stay tight; the 12pt row gap separates the groups.
  commentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  commentMeta: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  // The timestamp trails the counts, separated by space rather than a dot.
  commentMetaTime: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 8,
  },
});
