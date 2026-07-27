import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, tapLight } from '@/lib/haptics';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet } from 'react-native';

type FollowRequest = {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  requested_at: string;
};

export default function FollowRequestsScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [requests, setRequests] = useState<FollowRequest[] | null>(null);

  useEffect(() => {
    api<FollowRequest[]>('/users/me/follow-requests')
      .then(setRequests)
      .catch((err: any) => Alert.alert('Could not load requests', err?.message));
  }, []);

  const respond = async (request: FollowRequest, action: 'accept' | 'decline') => {
    tapLight();
    setRequests((current) => current?.filter((item) => item.id !== request.id) ?? []);
    try {
      await api(`/users/follow-requests/${request.id}/${action}`, { body: {} });
      if (action === 'accept') notifySuccess();
    } catch (err: any) {
      setRequests((current) => [request, ...(current ?? [])]);
      Alert.alert('Could not update request', err?.message ?? 'Please try again.');
    }
  };

  if (!requests) {
    return <ThemedView style={styles.center}><ActivityIndicator color={c.primary} /></ThemedView>;
  }

  return (
    <ThemedView style={styles.screen}>
      {requests.length === 0 ? (
        <ThemedView style={styles.center}>
          <ThemedText style={styles.emptyTitle}>No pending requests</ThemedText>
          <ThemedText style={styles.emptyText}>New follow requests will appear here.</ThemedText>
        </ThemedView>
      ) : (
        requests.map((request) => (
          <ThemedView key={request.id} style={styles.row}>
            <Image
              source={request.avatar_url ? { uri: request.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
              style={styles.avatar}
            />
            <ThemedView style={styles.copy}>
              <ThemedText style={styles.name}>{request.username}</ThemedText>
              {request.bio ? <ThemedText numberOfLines={1} style={styles.bio}>{request.bio}</ThemedText> : null}
            </ThemedView>
            <Pressable onPress={() => respond(request, 'decline')} style={styles.decline}>
              <ThemedText style={styles.declineText}>Decline</ThemedText>
            </Pressable>
            <Pressable onPress={() => respond(request, 'accept')} style={styles.accept}>
              <ThemedText style={styles.acceptText}>Accept</ThemedText>
            </Pressable>
          </ThemedView>
        ))
      )}
    </ThemedView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, padding: 16, gap: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '900' },
    emptyText: { color: c.muted, marginTop: 6 },
    row: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, borderRadius: 16, padding: 10 },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    copy: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
    name: { fontWeight: '900', fontSize: 15 },
    bio: { color: c.muted, fontSize: 12, marginTop: 2 },
    decline: { paddingHorizontal: 10, paddingVertical: 8 },
    declineText: { color: c.subtle, fontWeight: '800', fontSize: 12 },
    accept: { backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
    acceptText: { color: c.onPrimary, fontWeight: '900', fontSize: 12 },
  });
