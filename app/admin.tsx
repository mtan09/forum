import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import { notifyWarning, tapLight } from '@/lib/haptics';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

type Report = {
  id: string;
  target_kind: 'post' | 'article' | 'comment' | 'user';
  target_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  reporter_username: string;
  target_preview: string | null;
  target_author: string | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam or misleading',
  harassment: 'Harassment',
  misinformation: 'False information',
  hate: 'Hate speech',
  other: 'Other',
};

function ReportCard({ report, onResolved }: { report: Report; onResolved: (id: string) => void }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const timeAgo = useRelativeTime(report.created_at);
  const [busy, setBusy] = useState(false);

  const act = async (action: 'hide' | 'ban' | 'dismiss') => {
    if (busy) return;
    if (action !== 'dismiss') notifyWarning(); else tapLight();
    const go = async () => {
      setBusy(true);
      try {
        await api(`/admin/reports/${report.id}/resolve`, { body: { action } });
        onResolved(report.id);
      } catch (err: any) {
        Alert.alert('Action failed', err?.message ?? 'Please try again.');
      } finally {
        setBusy(false);
      }
    };
    if (action === 'ban') {
      Alert.alert(
        `Ban ${report.target_author ?? 'this user'}?`,
        'They will be locked out of the app entirely.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Ban', style: 'destructive', onPress: go }]
      );
    } else {
      await go();
    }
  };

  const canHide = report.target_kind === 'post' || report.target_kind === 'comment';

  return (
    <ThemedView style={styles.card}>
      <ThemedView style={styles.cardHeader}>
        <ThemedText style={styles.kind}>{report.target_kind.toUpperCase()}</ThemedText>
        <ThemedText style={styles.reason}>{REASON_LABELS[report.reason] ?? report.reason}</ThemedText>
        <ThemedText style={styles.time}>{timeAgo}</ThemedText>
      </ThemedView>
      <ThemedText style={styles.meta}>
        Reported by {report.reporter_username}
        {report.target_author ? ` · content by ${report.target_author}` : ''}
      </ThemedText>
      {report.target_preview ? (
        <ThemedText style={styles.preview} numberOfLines={4}>{report.target_preview}</ThemedText>
      ) : (
        <ThemedText style={[styles.preview, { fontStyle: 'italic' }]}>Content unavailable (may be deleted).</ThemedText>
      )}
      {report.detail ? <ThemedText style={styles.detail}>&ldquo;{report.detail}&rdquo;</ThemedText> : null}
      <ThemedView style={styles.actions}>
        {canHide && (
          <Pressable onPress={() => act('hide')} disabled={busy} style={[styles.actionBtn, styles.hideBtn]}>
            <ThemedText style={styles.hideText}>Hide content</ThemedText>
          </Pressable>
        )}
        <Pressable onPress={() => act('ban')} disabled={busy} style={[styles.actionBtn, styles.banBtn]}>
          <ThemedText style={styles.banText}>Ban user</ThemedText>
        </Pressable>
        <Pressable onPress={() => act('dismiss')} disabled={busy} style={[styles.actionBtn, styles.dismissBtn]}>
          <ThemedText style={styles.dismissText}>Dismiss</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export default function AdminReports() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setReports(await api<Report[]>('/admin/reports?status=open'));
    } catch (err: any) {
      Alert.alert('Could not load reports', err?.message ?? 'Are you an admin?');
      setReports((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (reports === null) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
      }
    >
      {reports.length === 0 ? (
        <ThemedText style={styles.empty}>No open reports. The queue is clear. 🎉</ThemedText>
      ) : (
        reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            onResolved={(id) => setReports((prev) => prev?.filter((x) => x.id !== id) ?? null)}
          />
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { textAlign: 'center', color: c.muted, marginTop: 48, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' },
  kind: {
    fontSize: 11,
    fontWeight: '800',
    color: c.accentDeep,
    backgroundColor: c.accentSoftBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  reason: { flex: 1, fontWeight: '700', fontSize: 14, color: c.red },
  time: { color: c.muted, fontSize: 12 },
  meta: { color: c.subtle, fontSize: 13 },
  preview: {
    fontSize: 14,
    lineHeight: 19,
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
  },
  detail: { color: c.subtle, fontSize: 13, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  hideBtn: { borderColor: c.amber },
  hideText: { color: c.amber, fontWeight: '800', fontSize: 13 },
  banBtn: { borderColor: c.red },
  banText: { color: c.red, fontWeight: '800', fontSize: 13 },
  dismissBtn: { borderColor: c.border },
  dismissText: { color: c.subtle, fontWeight: '700', fontSize: 13 },
});
