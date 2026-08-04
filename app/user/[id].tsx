import ContentActions from '@/components/contentActions';
import AvatarVisual from '@/components/avatar-visual';
import DisplayName from '@/components/display-name';
import Post, { PostType } from '@/components/postComponent';
import ScalableImage from '@/components/scalable-image';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { mapPost } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifyWarning, tapLight } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

type PublicUser = {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  header_url?: string | null;
  created_at?: string;
  blocked_by_me?: boolean;
  followed_by_me?: boolean;
  follow_status?: 'pending' | 'accepted' | null;
  is_private?: boolean;
  is_demo?: boolean;
  can_view_history?: boolean;
  follower_count?: number;
  following_count?: number;
};

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

export default function PublicProfile() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const frameWidth = Platform.OS === 'web' ? Math.min(windowWidth, 760) : windowWidth;
  const { id } = useLocalSearchParams();
  const userId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);
  const router = useRouter();
  const { user: me } = useAuth();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [spectrum, setSpectrum] = useState<SpectrumData | null>(null);
  const [posts, setPosts] = useState<PostType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [followStatus, setFollowStatus] = useState<'pending' | 'accepted' | null>(null);
  const [followerCount, setFollowerCount] = useState(0);

  const isSelf = !!me && me.id === userId;

  // Optimistic follow/unfollow with rollback
  const toggleFollow = async () => {
    if (!userId) return;
    tapLight();
    const previous = followStatus;
    const removing = previous === 'pending' || previous === 'accepted';
    setFollowStatus(removing ? null : user?.is_private ? 'pending' : 'accepted');
    if (previous === 'accepted') setFollowerCount((n) => Math.max(0, n - 1));
    if (!removing && !user?.is_private) setFollowerCount((n) => n + 1);
    try {
      if (removing) {
        await api(`/users/${userId}/follow`, { method: 'DELETE' });
      } else {
        const response = await api<{ follow_status: 'pending' | 'accepted' }>(
          `/users/${userId}/follow`,
          { body: {} }
        );
        setFollowStatus(response.follow_status);
      }
    } catch (err: any) {
      setFollowStatus(previous);
      if (previous === 'accepted') setFollowerCount((n) => n + 1);
      if (!removing && !user?.is_private) setFollowerCount((n) => Math.max(0, n - 1));
      Alert.alert('Could not update follow', err?.message ?? 'Please try again.');
    }
  };

  const toggleBlock = async () => {
    if (!userId) return;
    notifyWarning();
    if (blocked) {
      setBlocked(false);
      try {
        await api(`/users/${userId}/block`, { method: 'DELETE' });
      } catch (err: any) {
        setBlocked(true);
        Alert.alert('Could not unblock', err?.message ?? 'Please try again.');
      }
      return;
    }
    Alert.alert(
      `Block ${user?.username ?? 'this user'}?`,
      `You won't see posts or comments from ${user?.username ?? 'them'} anywhere on the forum.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlocked(true);
            try {
              await api(`/users/${userId}/block`, { body: {} });
            } catch (err: any) {
              setBlocked(false);
              Alert.alert('Could not block', err?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([
      api<PublicUser>(`/users/${userId}`),
      api<SpectrumData>(`/users/${userId}/spectrum`),
    ])
      .then(async ([u, s]) => {
        if (!active) return;
        setUser(u);
        setBlocked(!!u.blocked_by_me);
        setFollowStatus(u.follow_status ?? (u.followed_by_me ? 'accepted' : null));
        setFollowerCount(u.follower_count ?? 0);
        setSpectrum(s);
        if (u.can_view_history !== false) {
          const p = await api<any[]>(`/posts?user_id=${userId}`);
          if (active) setPosts(p.map(mapPost));
        } else {
          setPosts(null);
        }
      })
      .catch((err: any) => { if (active) setError(err?.message ?? 'Failed to load profile'); });
    return () => { active = false; };
  }, [userId]);

  if (error) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Error: {error}</ThemedText>
      </ThemedView>
    );
  }
  if (!user) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading profile…</ThemedText>
      </ThemedView>
    );
  }

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <WebPageFrame maxWidth={760}>
        <ScalableImage
        source={
          user.header_url
            ? { uri: user.header_url }
            : require('@/assets/images/solid-color-image.png')
        }
        type="width"
        dimension={frameWidth}
        height={140}
      />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.avatarContainer}>
          <AvatarVisual
            userId={user.id}
            avatarUrl={user.avatar_url}
            isDemo={user.is_demo}
            size={88}
            style={styles.avatar}
          />
        </ThemedView>

        <ThemedView style={styles.usernameRow}>
          <DisplayName username={user.username} isDemo={user.is_demo} nameStyle={styles.username} />
          {!isSelf && (
            blocked ? (
              <Pressable onPress={toggleBlock} style={styles.unblockBtn}>
                <ThemedText style={styles.unblockText}>Unblock</ThemedText>
              </Pressable>
            ) : (
              <ThemedView style={styles.actionsRow}>
                <Pressable
                  onPress={() => { tapLight(); router.push(`/dm/${user.id}`); }}
                  style={styles.messageBtn}
                >
                  <IconSymbol name="envelope" size={16} color={c.primary} />
                </Pressable>
                <Pressable
                  onPress={toggleFollow}
                  style={[styles.followBtn, followStatus && styles.followingBtn]}
                >
                  <ThemedText style={[styles.followText, followStatus && styles.followingText]}>
                    {followStatus === 'accepted'
                      ? 'Following'
                      : followStatus === 'pending'
                        ? 'Requested'
                        : 'Follow'}
                  </ThemedText>
                </Pressable>
                <ContentActions
                  targetKind="user"
                  targetId={user.id}
                  authorId={user.id}
                  authorName={user.username}
                  onBlocked={() => setBlocked(true)}
                />
              </ThemedView>
            )
          )}
        </ThemedView>
        <ThemedView style={styles.followCountsRow}>
          <Pressable
            onPress={() => router.push({ pathname: '/connections/[userId]', params: { userId: user.id, tab: 'followers' } })}
            style={({ pressed }) => [styles.countButton, pressed && styles.countPressed]}
          >
            <ThemedText style={styles.followCountNumber}>{followerCount}</ThemedText>
            <ThemedText style={styles.followCounts}>follower{followerCount === 1 ? '' : 's'}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/connections/[userId]', params: { userId: user.id, tab: 'following' } })}
            style={({ pressed }) => [styles.countButton, pressed && styles.countPressed]}
          >
            <ThemedText style={styles.followCountNumber}>{user.following_count ?? 0}</ThemedText>
            <ThemedText style={styles.followCounts}>following</ThemedText>
          </Pressable>
        </ThemedView>
        {blocked && (
          <ThemedView style={styles.blockedBanner}>
            <IconSymbol name="hand.raised.fill" size={14} color={c.amber} />
            <ThemedText style={styles.blockedText}>
              You&apos;ve blocked this user. Their posts and comments are hidden across the app.
            </ThemedText>
          </ThemedView>
        )}
        {user.bio ? <ThemedText>{user.bio}</ThemedText> : null}
        {joined && (
          <ThemedView style={styles.joinedRow}>
            <IconSymbol name="calendar" size={14} color={c.muted} />
            <ThemedText style={styles.joinedText}>Joined {joined}</ThemedText>
          </ThemedView>
        )}

        {/* Same computed placement shown on the owner's profile */}
        <ThemedView style={styles.spectrumCard}>
          <ThemedView style={styles.spectrumHeader}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>Political Lean</ThemedText>
            {spectrum && (
              <ThemedView style={styles.leanBadge}>
                <ThemedText style={styles.leanBadgeText}>{leanLabel(spectrum.position)}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
          <Spectrum width={Math.max(1, frameWidth - 64)} height={20} position={spectrum?.position ?? 0.5} />
          {spectrum && (
            <ThemedText style={styles.sampleText}>
              Computed from {spectrum.sample.posts} scored post{spectrum.sample.posts === 1 ? '' : 's'} and {spectrum.sample.upvotes + spectrum.sample.downvotes} vote{spectrum.sample.upvotes + spectrum.sample.downvotes === 1 ? '' : 's'}.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.postsHeader}>
        <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>Posts</ThemedText>
      </ThemedView>
      {user.can_view_history === false && (
        <ThemedView style={styles.privateHistory}>
          <IconSymbol name="lock.fill" size={20} color={c.primary} />
          <ThemedView style={styles.privateHistoryCopy}>
            <ThemedText style={styles.privateHistoryTitle}>Private profile history</ThemedText>
            <ThemedText style={styles.privateHistoryText}>
              Follow this account to browse its posts and other activity in one place.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
      {posts && posts.length === 0 && (
        <ThemedText style={styles.emptyText}>No posts yet.</ThemedText>
      )}
      {posts?.map((post) => (
        <Pressable
          key={post.id}
          onPress={() => router.push(`/post/${post.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
        >
          <Post post={post} />
        </Pressable>
      ))}
      <ThemedView style={{ height: 32 }} />
      </WebPageFrame>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  scroll: {
    backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 32 : 0,
  },
  container: {
    padding: 16,
    gap: 10,
  },
  avatarContainer: {
    position: 'absolute',
    top: -44,
    left: 8,
    borderRadius: 44,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderColor: c.background,
    borderWidth: 6,
  },
  usernameRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageBtn: {
    borderWidth: 1.5,
    borderColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  followText: {
    color: c.onPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  followingText: {
    color: c.primary,
  },
  followCounts: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  followCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'transparent',
  },
  countButton: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  followCountNumber: { color: c.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  countPressed: { opacity: 0.55 },
  username: {
    fontWeight: '800',
    fontSize: 22,
  },
  unblockBtn: {
    borderWidth: 1.5,
    borderColor: c.red,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: {
    color: c.red,
    fontWeight: '800',
    fontSize: 14,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.amberBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  blockedText: {
    flex: 1,
    color: c.amber,
    fontSize: 13,
    lineHeight: 18,
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
    marginTop: 4,
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
  postsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  privateHistory: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privateHistoryCopy: { flex: 1, backgroundColor: 'transparent' },
  privateHistoryTitle: { fontWeight: '900', fontSize: 15 },
  privateHistoryText: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  emptyText: {
    textAlign: 'center',
    color: c.muted,
    marginVertical: 24,
  },
});
