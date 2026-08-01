import AppRefreshControl from '@/components/appRefreshControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserAvatar from '@/components/user-avatar';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapLight } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

type ConnectionTab = 'followers' | 'following';

type Connection = {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
};

export default function ConnectionsScreen() {
  const { userId: rawUserId, tab: rawTab } = useLocalSearchParams<{
    userId: string;
    tab?: string;
  }>();
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const initialTab: ConnectionTab = rawTab === 'following' ? 'following' : 'followers';
  const [tab, setTab] = useState<ConnectionTab>(initialTab);
  const [rows, setRows] = useState<Connection[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const load = useCallback(async (showRefresh = false) => {
    if (!userId) return;
    if (showRefresh) setRefreshing(true);
    else setRows(null);
    setError(null);
    try {
      setRows(await api<Connection[]>(`/users/${userId}/${tab}`));
    } catch (err: any) {
      setRows([]);
      setError(err?.message ?? `Could not load ${tab}.`);
    } finally {
      setRefreshing(false);
    }
  }, [tab, userId]);

  useEffect(() => { load(); }, [load]);

  const selectTab = (next: ConnectionTab) => {
    if (next === tab) return;
    tapLight();
    setTab(next);
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.tabs}>
        {(['followers', 'following'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => selectTab(item)}
            style={[styles.tab, tab === item && styles.tabSelected]}
          >
            <ThemedText style={[styles.tabText, tab === item && styles.tabTextSelected]}>
              {item === 'followers' ? 'Followers' : 'Following'}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      {rows === null ? (
        <ThemedView style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </ThemedView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <AppRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          )}
          contentContainerStyle={rows.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <ThemedView style={styles.row}>
              <UserAvatar
                userId={item.id}
                avatarUrl={item.avatar_url}
                accessibilityLabel={`Open ${item.username}'s profile`}
              />
              <Pressable
                onPress={() => router.push(`/user/${item.id}`)}
                style={({ pressed }) => [styles.rowCopy, pressed && styles.pressed]}
              >
                <ThemedText style={styles.username}>{item.username}</ThemedText>
                {item.bio ? (
                  <ThemedText style={styles.bio} numberOfLines={2}>{item.bio}</ThemedText>
                ) : null}
              </Pressable>
            </ThemedView>
          )}
          ListEmptyComponent={(
            <ThemedView style={styles.empty}>
              <ThemedText style={styles.emptyTitle}>
                {error ?? (tab === 'followers' ? 'No followers yet' : 'Not following anyone yet')}
              </ThemedText>
              {!error ? (
                <ThemedText style={styles.emptyText}>
                  {tab === 'followers'
                    ? 'Accounts that follow this profile will appear here.'
                    : 'Accounts followed by this profile will appear here.'}
                </ThemedText>
              ) : null}
            </ThemedView>
          )}
        />
      )}
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 4,
    borderRadius: 15,
    backgroundColor: c.surfaceMuted,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: { backgroundColor: c.card },
  tabText: { color: c.muted, fontSize: 14, fontWeight: '800' },
  tabTextSelected: { color: c.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingVertical: 10 },
  emptyContent: { flexGrow: 1 },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    paddingVertical: 10,
  },
  rowCopy: { flex: 1, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  username: { fontSize: 16, fontWeight: '800' },
  bio: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: c.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
