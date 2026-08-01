import AppTextInput from '@/components/app-text-input';
import CommentList from '@/components/commentComponent';
import ShareCardModal from '@/components/shareCardModal';
import { StanceShareCard } from '@/components/shareCards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { selectTick, tapLight, tapMedium } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

type Distribution = { bins: number[]; median: number | null };

type DebateDetail = {
  id: string;
  kind: 'biggest' | 'contested' | 'trending';
  subtopic_id: string | null;
  title: string;
  total_votes: number;
  comment_count: number;
  my_position: number | null;
  distribution: Distribution;
};

const kindMeta = (c: Palette) => ({
  biggest: { label: 'Biggest story', color: c.accentDeep, bg: c.accentSoftBg },
  contested: { label: 'Most divided', color: c.red, bg: c.redBg },
  trending: { label: 'Trending', color: c.amber, bg: c.amberBg },
} as const);

// The spectrum track: tap anywhere to place (or move) your pin
function SpectrumTrack({ pin, onPlace }: { pin: number | null; onPlace: (p: number) => void }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const handlePress = (e: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const pageX = e.nativeEvent.pageX;
    selectTick();
    trackRef.current?.measureInWindow((trackLeft) => {
      const x = pageX - trackLeft;
      onPlace(Math.min(Math.max(x / trackWidth, 0), 1));
    });
  };
  const adjust = (delta: number) => {
    selectTick();
    onPlace(Math.min(Math.max((pin ?? 0.5) + delta, 0), 1));
  };
  return (
    <ThemedView style={styles.trackPressable}>
      <Pressable
        ref={trackRef}
        onPress={handlePress}
        accessibilityRole="adjustable"
        accessibilityLabel="Choose where you stand"
        accessibilityValue={{ min: 0, max: 100, now: Math.round((pin ?? 0.5) * 100) }}
        accessibilityActions={[
          { name: 'increment', label: 'Move right' },
          { name: 'decrement', label: 'Move left' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') adjust(0.05);
          if (event.nativeEvent.actionName === 'decrement') adjust(-0.05);
        }}
        style={styles.trackWrap}
        onLayout={(event) => setTrackWidth(Math.round(event.nativeEvent.layout.width))}
      >
        <LinearGradient
          colors={[c.blue, c.primary, c.red]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        />
        {pin != null && trackWidth > 0 && (
          <ThemedView style={[styles.pin, { left: pin * (trackWidth - 14) }]} />
        )}
      </Pressable>
      <ThemedView style={styles.trackLabels}>
        <ThemedText style={styles.trackLabel}>Left</ThemedText>
        <ThemedText style={styles.trackLabel}>Right</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

function Histogram({ dist, myPosition }: { dist: Distribution; myPosition: number }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const max = Math.max(...dist.bins, 1);
  const myBin = Math.min(Math.floor(myPosition * 10), 9);
  return (
    <ThemedView style={styles.histogram}>
      {dist.bins.map((n, i) => (
        <ThemedView key={i} style={styles.histColumn}>
          <ThemedView
            style={[
              styles.histBar,
              {
                height: 6 + (n / max) * 64,
                backgroundColor: i === myBin ? c.accentDeep : c.barTrack,
              },
            ]}
          />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

export default function DebateScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const KIND_META = useMemo(() => kindMeta(c), [c]);
  const { id } = useLocalSearchParams();
  const debateId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);
  const router = useRouter();

  const [debate, setDebate] = useState<DebateDetail | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!debateId) return;
    let active = true;
    api<DebateDetail>(`/debates/${debateId}`)
      .then((d) => { if (active) setDebate(d); })
      .catch((err: any) => { if (active) setError(err?.message ?? 'Failed to load debate'); });
    return () => { active = false; };
  }, [debateId]);

  const submitPosition = async () => {
    if (pending == null || !debateId || submitting) return;
    try {
      tapMedium();
      setSubmitting(true);
      const res = await api<{ my_position: number; distribution: Distribution }>(
        `/debates/${debateId}/vote`,
        { body: { position: Number(pending.toFixed(3)) } }
      );
      setDebate((prev) =>
        prev
          ? {
              ...prev,
              my_position: res.my_position,
              distribution: res.distribution,
              total_votes: prev.my_position == null ? prev.total_votes + 1 : prev.total_votes,
            }
          : prev
      );
      setPending(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || postingComment || !debateId) return;
    try {
      tapMedium();
      setPostingComment(true);
      await api('/comments', { body: { debate_id: debateId, content } });
      setCommentText('');
      Keyboard.dismiss();
      setRefreshKey((k) => k + 1);
      setDebate((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to comment');
    } finally {
      setPostingComment(false);
    }
  };

  if (error && !debate) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Error: {error}</ThemedText>
      </ThemedView>
    );
  }
  if (!debate) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading debate…</ThemedText>
      </ThemedView>
    );
  }

  const meta = KIND_META[debate.kind];
  const hasVoted = debate.my_position != null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <WebPageFrame maxWidth={720}>
          <ThemedView style={styles.container}>
          <ThemedView style={[styles.kindChip, { backgroundColor: meta.bg }]}>
            <ThemedText style={[styles.kindChipText, { color: meta.color }]}>{meta.label}</ThemedText>
          </ThemedView>
          <ThemedText type="defaultSemiBold" style={styles.title}>{debate.title}</ThemedText>

          {debate.subtopic_id && (
            <Pressable
              onPress={() => router.push(`/summary/${debate.subtopic_id}`)}
              style={({ pressed }) => [styles.coverageLink, { opacity: pressed ? 0.7 : 1 }]}
            >
              <ThemedText style={styles.coverageLinkText}>Read the coverage first</ThemedText>
              <IconSymbol name="chevron.right" size={14} color={c.primary} />
            </Pressable>
          )}

          {/* Stance card: commit before you see the room */}
          <ThemedView style={styles.stanceCard}>
            {!hasVoted ? (
              <>
                <ThemedText type="defaultSemiBold" style={styles.stanceTitle}>Where do you land?</ThemedText>
                <ThemedText style={styles.stanceHint}>
                  Tap the spectrum to place your pin. The room&apos;s split is revealed after you commit.
                </ThemedText>
                <SpectrumTrack pin={pending} onPlace={setPending} />
                {pending != null && (
                  <Pressable
                    onPress={submitPosition}
                    disabled={submitting}
                    style={({ pressed }) => [styles.lockButton, { opacity: pressed || submitting ? 0.7 : 1 }]}
                  >
                    <ThemedText style={styles.lockButtonText}>
                      {submitting ? 'Locking in…' : 'Lock in my position'}
                    </ThemedText>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <ThemedText type="defaultSemiBold" style={styles.stanceTitle}>The room so far</ThemedText>
                <Histogram dist={debate.distribution} myPosition={debate.my_position!} />
                <SpectrumTrack
                  pin={pending ?? debate.my_position}
                  onPlace={setPending}
                />
                <ThemedText style={styles.stanceHint}>
                  {debate.total_votes} voice{debate.total_votes === 1 ? '' : 's'}
                  {debate.distribution.median != null
                    ? ` · community median ${debate.distribution.median.toFixed(2)}`
                    : ''} · your pin is highlighted
                </ThemedText>
                {pending != null && pending !== debate.my_position && (
                  <Pressable
                    onPress={submitPosition}
                    disabled={submitting}
                    style={({ pressed }) => [styles.lockButton, { opacity: pressed || submitting ? 0.7 : 1 }]}
                  >
                    <ThemedText style={styles.lockButtonText}>
                      {submitting ? 'Moving…' : 'Move my pin'}
                    </ThemedText>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => { tapLight(); setShareOpen(true); }}
                  style={({ pressed }) => [styles.shareStance, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="square.and.arrow.up" size={16} color={c.primary} />
                  <ThemedText style={styles.shareStanceText}>Share my stance</ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>

          {/* One shared thread for the whole room */}
          <ThemedView style={{ marginTop: 8 }}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', marginBottom: 8 }}>
              The thread
            </ThemedText>
            <AppTextInput
              placeholder={hasVoted ? 'Make your case…' : 'Take a stance to join the thread…'}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              editable={hasVoted && !postingComment}
              actionIcon="paperplane.fill"
              actionLabel="Post to the thread"
              actionDisabled={!hasVoted || postingComment || !commentText.trim()}
              onAction={submitComment}
              containerStyle={styles.composer}
            />

            <CommentList debateId={debate.id} refreshKey={refreshKey} />
          </ThemedView>
          </ThemedView>
        </WebPageFrame>
      </ScrollView>

      {hasVoted && (
        <ShareCardModal
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          hint="Save or share your stance card"
        >
          <StanceShareCard
            title={debate.title}
            position={debate.my_position!}
            median={debate.distribution.median}
            voices={debate.total_votes}
          />
        </ShareCardModal>
      )}
    </KeyboardAvoidingView>
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
    padding: Platform.OS === 'web' ? 22 : 16,
    gap: 12,
  },
  kindChip: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kindChipText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  coverageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverageLinkText: {
    color: c.primary,
    fontWeight: '700',
  },
  stanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 16,
    gap: 12,
  },
  stanceTitle: {
    fontWeight: '800',
  },
  stanceHint: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  trackPressable: {
    width: '100%',
    backgroundColor: 'transparent',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  trackWrap: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  track: {
    width: '100%',
    height: 16,
    borderRadius: 8,
  },
  pin: {
    position: 'absolute',
    width: 14,
    height: 28,
    borderRadius: 7,
    backgroundColor: c.spectrumThumb,
    borderWidth: 2,
    borderColor: c.text,
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  trackLabel: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  lockButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  lockButtonText: {
    color: c.onPrimary,
    fontWeight: '800',
  },
  shareStance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  shareStanceText: {
    color: c.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  histogram: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 72,
    gap: 3,
    backgroundColor: 'transparent',
  },
  histColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  histBar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  composer: {
    marginBottom: 12,
  },
});
