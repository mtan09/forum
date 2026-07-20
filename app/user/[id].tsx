import ContentActions from '@/components/contentActions';
import Post, { PostType } from '@/components/postComponent';
import ScalableImage from '@/components/scalable-image';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/authContext';
import { mapPost } from '@/context/postContext';
import { api } from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

type PublicUser = {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  header_url?: string | null;
  created_at?: string;
  blocked_by_me?: boolean;
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
  const { id } = useLocalSearchParams();
  const userId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);
  const router = useRouter();
  const { user: me } = useAuth();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [spectrum, setSpectrum] = useState<SpectrumData | null>(null);
  const [posts, setPosts] = useState<PostType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const isSelf = !!me && me.id === userId;

  const toggleBlock = async () => {
    if (!userId) return;
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
      api<any[]>(`/posts?user_id=${userId}`),
    ])
      .then(([u, s, p]) => {
        if (!active) return;
        setUser(u);
        setBlocked(!!u.blocked_by_me);
        setSpectrum(s);
        setPosts(p.map(mapPost));
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
    <ScrollView>
      <ScalableImage
        source={
          user.header_url
            ? { uri: user.header_url }
            : require('@/assets/images/solid-color-image.png')
        }
        type="width"
        dimension={screenWidth}
        height={140}
      />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.avatarContainer}>
          <Image
            source={
              user.avatar_url
                ? { uri: user.avatar_url }
                : require('@/assets/images/Default_pfp.jpg')
            }
            style={styles.avatar}
          />
        </ThemedView>

        <ThemedView style={styles.usernameRow}>
          <ThemedText type="defaultSemiBold" style={styles.username}>{user.username}</ThemedText>
          {!isSelf && (
            blocked ? (
              <Pressable onPress={toggleBlock} style={styles.unblockBtn}>
                <ThemedText style={styles.unblockText}>Unblock</ThemedText>
              </Pressable>
            ) : (
              <ContentActions
                targetKind="user"
                targetId={user.id}
                authorId={user.id}
                authorName={user.username}
                onBlocked={() => setBlocked(true)}
              />
            )
          )}
        </ThemedView>
        {blocked && (
          <ThemedView style={styles.blockedBanner}>
            <IconSymbol name="hand.raised.fill" size={14} color="#B4530E" />
            <ThemedText style={styles.blockedText}>
              You've blocked this user. Their posts and comments are hidden across the app.
            </ThemedText>
          </ThemedView>
        )}
        {user.bio ? <ThemedText>{user.bio}</ThemedText> : null}
        {joined && (
          <ThemedView style={styles.joinedRow}>
            <IconSymbol name="calendar" size={14} color="#8D8D8D" />
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
          <Spectrum width={screenWidth - 64} height={20} position={spectrum?.position ?? 0.5} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#FFF',
    borderWidth: 6,
  },
  usernameRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  username: {
    fontWeight: '800',
    fontSize: 22,
  },
  unblockBtn: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  blockedText: {
    flex: 1,
    color: '#B4530E',
    fontSize: 13,
    lineHeight: 18,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinedText: {
    color: '#8D8D8D',
    fontSize: 13,
  },
  spectrumCard: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DCFF',
    backgroundColor: '#F5F2FF',
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
    backgroundColor: '#B647FF',
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
    color: '#5A5A5A',
    fontSize: 13,
    lineHeight: 18,
  },
  postsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#c6c6c6ff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8D8D8D',
    marginVertical: 24,
  },
});
