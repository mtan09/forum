import AppRefreshControl from '@/components/appRefreshControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';

type Run = {
  id: string;
  status: string;
  feeds_ok: number;
  feeds_failed: number;
  sources_failed: string[];
  seen: number;
  inserted: number;
  duration_ms?: number | null;
  started_at: string;
};

export default function AdminIngestScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [data, setData] = useState<{ runs: Run[]; last_success_at: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => api<{ runs: Run[]; last_success_at: string | null }>('/admin/ingest-status').then(setData).catch((err: any) => Alert.alert('Could not load ingest status', err?.message)), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <ThemedView style={styles.center}><ActivityIndicator color={c.primary} /></ThemedView>;
  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <ThemedView style={styles.summary}>
        <ThemedText style={styles.summaryLabel}>LAST SUCCESS</ThemedText>
        <ThemedText style={styles.summaryValue}>{data.last_success_at ? new Date(data.last_success_at).toLocaleString() : 'No successful run recorded'}</ThemedText>
      </ThemedView>
      {data.runs.map((run) => (
        <ThemedView key={run.id} style={styles.card}>
          <ThemedView style={styles.row}>
            <ThemedText style={[styles.status, run.status === 'success' ? styles.ok : run.status === 'partial' ? styles.warning : styles.bad]}>{run.status.toUpperCase()}</ThemedText>
            <ThemedText style={styles.time}>{new Date(run.started_at).toLocaleString()}</ThemedText>
          </ThemedView>
          <ThemedText style={styles.metrics}>{run.inserted} inserted · {run.seen} seen · {run.feeds_ok} feeds OK · {run.feeds_failed} failed · {Math.round((run.duration_ms ?? 0) / 1000)}s</ThemedText>
          {run.sources_failed?.length ? <ThemedText style={styles.failures}>{run.sources_failed.join(', ')}</ThemedText> : null}
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 10, paddingBottom: 48 },
  summary: { padding: 16, borderRadius: 16, backgroundColor: c.accentFaint, borderWidth: 1, borderColor: c.primary },
  summaryLabel: { color: c.primary, fontSize: 10, fontWeight: '900' },
  summaryValue: { color: c.onAccentFaint, fontSize: 15, fontWeight: '800', marginTop: 4 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, gap: 7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  status: { fontSize: 11, fontWeight: '900' },
  ok: { color: c.success }, warning: { color: c.amber }, bad: { color: c.danger },
  time: { color: c.muted, fontSize: 11 },
  metrics: { color: c.subtle, fontSize: 13, lineHeight: 18 },
  failures: { color: c.danger, fontSize: 12, lineHeight: 17 },
});
