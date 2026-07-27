import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifyWarning, tapLight } from '@/lib/haptics';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

type Review = {
  id: string;
  surface: string;
  categories: string[];
  target_kind: string | null;
  target_preview: string | null;
  created_at: string;
};

export default function AdminModerationScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<Review[] | null>(null);
  useEffect(() => {
    api<Review[]>('/admin/moderation/review').then(setItems).catch((err: any) => Alert.alert('Could not load moderation review', err?.message));
  }, []);
  const resolve = async (item: Review, action: 'keep' | 'hide') => {
    if (action === 'hide') notifyWarning(); else tapLight();
    try {
      await api(`/admin/moderation/${item.id}/resolve`, { body: { action } });
      setItems((current) => current?.filter((entry) => entry.id !== item.id) ?? []);
    } catch (err: any) {
      Alert.alert('Could not resolve review', err?.message);
    }
  };
  if (!items) return <ThemedView style={styles.center}><ActivityIndicator color={c.primary} /></ThemedView>;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {items.length === 0 ? <ThemedText style={styles.empty}>No mock-corpus items need review.</ThemedText> : items.map((item) => (
        <ThemedView key={item.id} style={styles.card}>
          <ThemedText style={styles.kind}>{item.surface.toUpperCase()} · {item.categories.join(', ')}</ThemedText>
          <ThemedText style={styles.preview}>{item.target_preview ?? 'Preview unavailable. The raw rejected input was not retained.'}</ThemedText>
          <ThemedView style={styles.actions}>
            <Pressable onPress={() => resolve(item, 'keep')} style={styles.keep}><ThemedText style={styles.keepText}>Keep</ThemedText></Pressable>
            <Pressable onPress={() => resolve(item, 'hide')} style={styles.hide}><ThemedText style={styles.hideText}>Hide</ThemedText></Pressable>
          </ThemedView>
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { color: c.muted, textAlign: 'center', marginTop: 48 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, gap: 10 },
  kind: { color: c.primary, fontSize: 11, fontWeight: '900' },
  preview: { color: c.text, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  keep: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, alignItems: 'center', padding: 9 },
  keepText: { color: c.subtle, fontWeight: '800' },
  hide: { flex: 1, borderWidth: 1, borderColor: c.danger, borderRadius: 10, alignItems: 'center', padding: 9 },
  hideText: { color: c.danger, fontWeight: '900' },
});
