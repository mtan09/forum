import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapLight } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

type BlockedUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  blocked_at: string;
};

export default function BlockedAccounts() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [users, setUsers] = useState<BlockedUser[] | null>(null);

  const load = async () => {
    try {
      setUsers(await api<BlockedUser[]>('/users/me/blocks'));
    } catch (err: any) {
      console.log('Error loading blocks:', err?.message);
      setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const unblock = (u: BlockedUser) => {
    tapLight();
    Alert.alert(`Unblock ${u.username}?`, 'Their posts and comments will be visible again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setUsers((prev) => prev?.filter((x) => x.id !== u.id) ?? null);
          try {
            await api(`/users/${u.id}/block`, { method: 'DELETE' });
          } catch (err: any) {
            Alert.alert('Could not unblock', err?.message ?? 'Please try again.');
            load();
          }
        },
      },
    ]);
  };

  if (users === null) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {users.length === 0 ? (
        <ThemedText style={styles.empty}>
          You haven&apos;t blocked anyone. Blocked accounts disappear from your feed, comments, and search.
        </ThemedText>
      ) : (
        users.map((u) => (
          <ThemedView key={u.id} style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.identity, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => router.push(`/user/${u.id}`)}
            >
              <Image
                source={u.avatar_url ? { uri: u.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
                style={styles.avatar}
              />
              <ThemedView style={{ flexShrink: 1 }}>
                <ThemedText type="defaultSemiBold" style={styles.username}>{u.username}</ThemedText>
                {u.bio ? <ThemedText style={styles.bio} numberOfLines={1}>{u.bio}</ThemedText> : null}
              </ThemedView>
            </Pressable>
            <Pressable onPress={() => unblock(u)} style={styles.unblockBtn}>
              <ThemedText style={styles.unblockText}>Unblock</ThemedText>
            </Pressable>
          </ThemedView>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 4 },
  empty: {
    textAlign: 'center',
    color: c.muted,
    marginTop: 40,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  username: { fontWeight: '700', fontSize: 16 },
  bio: { color: c.muted, fontSize: 13 },
  unblockBtn: {
    borderWidth: 1.5,
    borderColor: c.red,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: { color: c.red, fontWeight: '800', fontSize: 14 },
});
