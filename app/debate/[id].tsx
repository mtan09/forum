import CommentList from '@/components/commentComponent';
import ShareCardModal from '@/components/shareCardModal';
import { StanceShareCard } from '@/components/shareCards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, GestureResponderEvent, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const TRACK_WIDTH = screenWidth - 64; // card padding 16 + screen padding 16, both sides

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

const KIND_META = {
  biggest: { label: 'Biggest story', color: '#9A00FF', bg: '#F1E8FB' },
  contested: { label: 'Most divided', color: '#DC2626', bg: '#FDE8E8' },
  trending: { label: 'Trending', color: '#B45309', bg: '#FEF3C7' },
} as const;

// The spectrum track: tap anywhere to place (or move) your pin
function SpectrumTrack({ pin, onPlace }: { pin: number | null; onPlace: (p: number) => void }) {
  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    onPlace(Math.min(Math.max(x / TRACK_WIDTH, 0), 1));
  };
  return (
    <Pressable onPress={handlePress}>
      <ThemedView style={styles.trackWrap}>
        <LinearGradient
          colors={['#2563EB', '#8B5CF6', '#EF4444']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        />
        {pin != null && (
          <ThemedView style={[styles.pin, { left: pin * TRACK_WIDTH - 7 }]} />
        )}
      </ThemedView>
      <ThemedView style={styles.trackLabels}>
        <ThemedText style={styles.trackLabel}>Left</ThemedText>
        <ThemedText style={styles.trackLabel}>Right</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function Histogram({ dist, myPosition }: { dist: Distribution; myPosition: number }) {
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
                backgroundColor: i === myBin ? '#9A00FF' : '#D8C2F5',
              },
            ]}
          />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

export default function DebateScreen() {
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
      <ScrollView keyboardShouldPersistTaps="handled">
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
              <IconSymbol name="chevron.right" size={14} color="#b647ff" />
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
                  onPress={() => setShareOpen(true)}
                  style={({ pressed }) => [styles.shareStance, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="square.and.arrow.up" size={16} color="#B647FF" />
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
            <ThemedView style={styles.composer}>
              <TextInput
                placeholder={hasVoted ? 'Make your case...' : 'Take a stance to join the thread...'}
                placeholderTextColor="#8f8f8f"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                style={styles.composerInput}
                editable={hasVoted && !postingComment}
              />
              <Pressable
                onPress={submitComment}
                disabled={!hasVoted || postingComment || !commentText.trim()}
              >
                <IconSymbol
                  name="arrow.up.circle.fill"
                  size={28}
                  color={hasVoted && commentText.trim() && !postingComment ? '#B647FF' : '#dfaeffff'}
                />
              </Pressable>
            </ThemedView>

            <CommentList debateId={debate.id} refreshKey={refreshKey} />
          </ThemedView>
        </ThemedView>
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
    color: '#b647ff',
    fontWeight: '700',
  },
  stanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DCFF',
    backgroundColor: '#F5F2FF',
    padding: 16,
    gap: 12,
  },
  stanceTitle: {
    fontWeight: '800',
  },
  stanceHint: {
    color: '#8D8D8D',
    fontSize: 13,
    lineHeight: 18,
  },
  trackWrap: {
    width: TRACK_WIDTH,
    height: 28,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  track: {
    width: TRACK_WIDTH,
    height: 16,
    borderRadius: 8,
  },
  pin: {
    position: 'absolute',
    width: 14,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  trackLabel: {
    color: '#8D8D8D',
    fontSize: 12,
    fontWeight: '600',
  },
  lockButton: {
    backgroundColor: '#B647FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  lockButtonText: {
    color: '#FFFFFF',
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
    color: '#B647FF',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: '#E9C8FF',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 96,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
