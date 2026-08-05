import AppRefreshControl from '@/components/appRefreshControl';
import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, tapLight } from '@/lib/haptics';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

type FeedbackStatus = 'open' | 'planned' | 'resolved' | 'dismissed';
type Feedback = {
  id: string;
  username?: string | null;
  category: string;
  message: string;
  screenshot_key?: string | null;
  route?: string | null;
  theme?: string | null;
  app_version?: string | null;
  build_number?: string | null;
  platform?: string | null;
  os_version?: string | null;
  device_model?: string | null;
  admin_notes?: string | null;
  created_at: string;
};

function FeedbackCard({ item, onDone }: { item: Feedback; onDone: (id: string) => void }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [notes, setNotes] = useState(item.admin_notes ?? '');
  const [busy, setBusy] = useState(false);

  const update = async (status: FeedbackStatus) => {
    if (busy) return;
    tapLight();
    setBusy(true);
    try {
      await api(`/admin/feedback/${item.id}`, {
        method: 'PATCH',
        body: { status, admin_notes: notes.trim() || null },
      });
      notifySuccess();
      onDone(item.id);
    } catch (err: any) {
      Alert.alert('Could not update feedback', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openScreenshot = async () => {
    try {
      const result = await api<{ url: string }>(`/admin/feedback/${item.id}/screenshot`);
      await WebBrowser.openBrowserAsync(result.url);
    } catch (err: any) {
      Alert.alert('Could not open screenshot', err?.message ?? 'Please try again.');
    }
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.category}>{item.category.toUpperCase()}</ThemedText>
        <ThemedText style={styles.meta}>{item.username ?? 'Deleted user'}</ThemedText>
      </ThemedView>
      <ThemedText style={styles.message}>{item.message}</ThemedText>
      <ThemedText style={styles.context}>
        {[item.route, item.theme, item.app_version && `v${item.app_version} (${item.build_number ?? '?'})`, item.device_model, item.os_version]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {item.screenshot_key ? (
        <Pressable onPress={openScreenshot} style={styles.screenshotButton}>
          <ThemedText style={styles.screenshotText}>Open private screenshot</ThemedText>
        </Pressable>
      ) : null}
      <AppTextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Admin notes"
        multiline
        containerStyle={styles.notes}
        textAlignVertical="top"
      />
      <ThemedView style={styles.actions}>
        <Pressable onPress={() => update('planned')} style={styles.secondary}><ThemedText style={styles.secondaryText}>Plan</ThemedText></Pressable>
        <Pressable onPress={() => update('dismissed')} style={styles.secondary}><ThemedText style={styles.secondaryText}>Dismiss</ThemedText></Pressable>
        <Pressable onPress={() => update('resolved')} style={styles.primary}><ThemedText style={styles.primaryText}>Resolve</ThemedText></Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export default function AdminFeedbackScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() =>
    api<Feedback[]>('/admin/feedback?status=open')
      .then(setItems)
      .catch((err: any) => Alert.alert('Could not load feedback', err?.message)), []);
  useEffect(() => { load(); }, [load]);

  if (!items) return <ThemedView style={styles.center}><ActivityIndicator color={c.primary} /></ThemedView>;
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {items.length === 0 ? <ThemedText style={styles.empty}>No open feedback.</ThemedText> : items.map((item) => (
        <FeedbackCard key={item.id} item={item} onDone={(id) => setItems((current) => current?.filter((entry) => entry.id !== id) ?? [])} />
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { color: c.muted, textAlign: 'center', marginTop: 44 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, padding: 14, gap: 9 },
  header: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  category: { color: c.primary, fontSize: 11, fontWeight: '900' },
  meta: { color: c.muted, fontSize: 12 },
  message: { fontSize: 15, lineHeight: 21 },
  context: { color: c.muted, fontSize: 11, lineHeight: 16 },
  screenshotButton: { borderWidth: 1, borderColor: c.primary, borderRadius: 10, padding: 9, alignItems: 'center' },
  screenshotText: { color: c.primary, fontWeight: '800', fontSize: 12 },
  notes: { minHeight: 70, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  secondary: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 9, alignItems: 'center' },
  secondaryText: { color: c.subtle, fontWeight: '800', fontSize: 12 },
  primary: { flex: 1, backgroundColor: c.primary, borderRadius: 10, padding: 9, alignItems: 'center' },
  primaryText: { color: c.onPrimary, fontWeight: '900', fontSize: 12 },
});
