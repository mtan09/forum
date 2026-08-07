import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Spectrum from '@/components/spectrum';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useMemo } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { tapLight } from '@/lib/haptics';

// The deterministic scorer records every signal that produced a
// placement (posts.position_signals / articles.lean_signals). This modal
// parses those strings back into plain language: no black box, receipts
// for every dot. Signal grammar, by prefix:
//   scorer:<version>       loaded:"phrase"×N      quotes:NN%
//   confidence:0.NN        left:"phrase"×N        subjectivity:0.NN
//   prior:0.NN             right:"phrase"×N       type:content_type(...)
//   stance-left/right:"issue · policy position"×N
//   stance-meta:{ side, issue, position, method, confidence, evidence }
type Framing = { side: 'left' | 'right' | 'loaded'; phrase: string; count: number };
type Stance = {
  side: 'left' | 'right';
  issue: string;
  position: string;
  method?: 'pattern' | 'compositional' | 'prototype' | 'context';
  confidence?: number;
  evidence?: string;
};

type Parsed = {
  version?: string;
  confidence?: number;
  prior?: number;
  contentType?: string;
  subjectivity?: number;
  quotes?: string;
  framing: Framing[];
  stances: Stance[];
};

const PHRASE_RE = /^(left|right|loaded):"(.+)"×(\d+)$/;
const STANCE_RE = /^stance-(left|right):"([^"·]+) · (.+)"×\d+$/;

function parse(signals: string[]): Parsed {
  const out: Parsed = { framing: [], stances: [] };
  for (const raw of signals) {
    if (raw.startsWith('stance-meta:')) {
      try {
        const value = JSON.parse(raw.slice('stance-meta:'.length)) as Stance;
        if (
          (value.side === 'left' || value.side === 'right') &&
          value.issue && value.position
        ) out.stances.push(value);
      } catch {
        // A malformed optional receipt must never break the explanation sheet.
      }
      continue;
    }
    const stance = STANCE_RE.exec(raw);
    if (stance) {
      out.stances.push({
        side: stance[1] as Stance['side'],
        issue: stance[2].trim(),
        position: stance[3],
      });
      continue;
    }
    const m = PHRASE_RE.exec(raw);
    if (m) {
      out.framing.push({ side: m[1] as Framing['side'], phrase: m[2], count: Number(m[3]) });
      continue;
    }
    const [key, ...rest] = raw.split(':');
    const value = rest.join(':');
    if (key === 'scorer') out.version = value;
    else if (key === 'confidence') out.confidence = Number(value);
    else if (key === 'prior') out.prior = Number(value);
    else if (key === 'subjectivity') out.subjectivity = Number(value);
    else if (key === 'quotes') out.quotes = value;
    else if (key === 'type') out.contentType = value.replace(/\(.*\)$/, '');
  }
  const merged = new Map<string, Stance>();
  for (const stance of out.stances) {
    const key = `${stance.side}:${stance.issue}:${stance.position}`;
    const current = merged.get(key);
    if (!current || stance.method) merged.set(key, stance);
  }
  out.stances = [...merged.values()];
  return out;
}

const methodLabel = (method: Stance['method']) => {
  if (method === 'pattern') return 'Direct policy match';
  if (method === 'compositional') return 'Policy argument';
  if (method === 'prototype') return 'Local semantic match';
  if (method === 'context') return 'Contextual alignment';
  return null;
};

function bandLabel(position: number): string {
  if (position < 0.2) return 'Strongly left';
  if (position < 0.4) return 'Leans left';
  if (position <= 0.6) return 'Center';
  if (position <= 0.8) return 'Leans right';
  return 'Strongly right';
}

const prettyType = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

type Props = {
  visible: boolean;
  onClose: () => void;
  position: number;
  signals: string[];
  kind?: 'post' | 'article';
};

export default function ScorerReceipts({ visible, onClose, position, signals, kind = 'post' }: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const spectrumWidth = Math.max(1, Math.min(windowWidth - 64, 640));
  const parsed = parse(signals);
  const stanceHits = parsed.stances;
  const leanHits = parsed.framing.filter((f) => f.side === 'left' || f.side === 'right');
  const loadedHits = parsed.framing.filter((f) => f.side === 'loaded');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => onClose()}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <IconSymbol name="checkmark.seal.fill" size={20} color={c.primary} />
              <ThemedText type="defaultSemiBold" style={styles.title}>Why this placement?</ThemedText>
            </View>

            <Spectrum width={spectrumWidth} height={20} position={position} />
            <ThemedText style={styles.band}>{bandLabel(position)}</ThemedText>

            {/* Source prior — articles start from their outlet's rating */}
            {kind === 'article' && parsed.prior != null && (
              <View style={styles.block}>
                <ThemedText style={styles.blockLabel}>Started from the outlet</ThemedText>
                <ThemedText style={styles.blockBody}>
                  This source&apos;s baseline rating is {bandLabel(parsed.prior).toLowerCase()} ({parsed.prior.toFixed(2)}).
                  The text below moved it from there.
                </ThemedText>
              </View>
            )}

            {stanceHits.length > 0 && (
              <View style={styles.block}>
                <ThemedText style={styles.blockLabel}>Policy stance</ThemedText>
                <View style={styles.stanceList}>
                  {stanceHits.map((stance, i) => (
                    <View key={`${stance.issue}-${stance.position}-${i}`} style={styles.stanceRow}>
                      <View style={[
                        styles.stanceMarker,
                        { backgroundColor: stance.side === 'left' ? c.blue : c.red },
                      ]} />
                      <View style={styles.stanceCopy}>
                        <ThemedText style={styles.stanceIssue}>{prettyType(stance.issue)}</ThemedText>
                        <ThemedText style={styles.stancePosition}>{prettyType(stance.position)}</ThemedText>
                        {stance.evidence && (
                          <ThemedText style={styles.stanceEvidence} numberOfLines={3}>
                            “{stance.evidence}”
                          </ThemedText>
                        )}
                        {methodLabel(stance.method) && (
                          <ThemedText style={styles.stanceMethod}>
                            {methodLabel(stance.method)}
                            {stance.confidence != null ? ` · ${Math.round(stance.confidence * 100)}% match` : ''}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Framing phrases that actually shifted the score */}
            {leanHits.length > 0 ? (
              <View style={styles.block}>
                <ThemedText style={styles.blockLabel}>The words that moved it</ThemedText>
                <View style={styles.chips}>
                  {leanHits.map((f, i) => (
                    <View
                      key={i}
                      style={[styles.chip, f.side === 'left' ? styles.chipLeft : styles.chipRight]}
                    >
                      <ThemedText style={[styles.chipText, f.side === 'left' ? styles.chipTextLeft : styles.chipTextRight]}>
                        {f.phrase}{f.count > 1 ? ` ×${f.count}` : ''}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : stanceHits.length === 0 ? (
              <View style={styles.block}>
                <ThemedText style={styles.blockLabel}>No directional language detected</ThemedText>
                <ThemedText style={styles.blockBody}>
                  The text did not move the score away from its starting point.
                </ThemedText>
              </View>
            ) : null}

            {/* Loaded / editorializing language (informs content type) */}
            {loadedHits.length > 0 && (
              <View style={styles.block}>
                <ThemedText style={styles.blockLabel}>Loaded language</ThemedText>
                <View style={styles.chips}>
                  {loadedHits.map((f, i) => (
                    <View key={i} style={[styles.chip, styles.chipLoaded]}>
                      <ThemedText style={[styles.chipText, styles.chipTextLoaded]}>
                        {f.phrase}{f.count > 1 ? ` ×${f.count}` : ''}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Fact row */}
            <View style={styles.facts}>
              {parsed.contentType && (
                <View style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Read as</ThemedText>
                  <ThemedText style={styles.factVal}>{prettyType(parsed.contentType)}</ThemedText>
                </View>
              )}
              {parsed.confidence != null && (
                <View style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Confidence</ThemedText>
                  <ThemedText style={styles.factVal}>{Math.round(parsed.confidence * 100)}%</ThemedText>
                </View>
              )}
              {parsed.quotes && (
                <View style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Quoted material</ThemedText>
                  <ThemedText style={styles.factVal}>{parsed.quotes}</ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={styles.footer}>
              Scored locally and deterministically by {parsed.version ?? 'the forum scorer'}.
              No post text is sent to third-party AI for this placement, and the same text always produces the same result.
            </ThemedText>

            <Pressable style={styles.closeBtn} onPress={() => { tapLight(); onClose(); }}>
              <ThemedText style={styles.closeText}>Got it</ThemedText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 704 : undefined,
    backgroundColor: c.overlayCard,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.faint,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  band: {
    fontSize: 15,
    fontWeight: '700',
    color: c.subtle,
    marginTop: 4,
    marginBottom: 8,
  },
  block: {
    marginTop: 16,
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  blockBody: {
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stanceList: {
    gap: 10,
  },
  stanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stanceMarker: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  stanceCopy: {
    flex: 1,
    gap: 2,
  },
  stanceIssue: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stancePosition: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
  stanceEvidence: {
    color: c.subtle,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  stanceMethod: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLeft: { backgroundColor: c.blueBg },
  chipRight: { backgroundColor: c.redBg },
  chipLoaded: { backgroundColor: c.accentSoftBg },
  chipText: { fontSize: 14, fontWeight: '700' },
  chipTextLeft: { color: c.blue },
  chipTextRight: { color: c.red },
  chipTextLoaded: { color: c.accentDeep },
  facts: {
    marginTop: 20,
    gap: 8,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  factKey: {
    fontSize: 14,
    color: c.muted,
  },
  factVal: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
  },
  footer: {
    marginTop: 24,
    fontSize: 13,
    lineHeight: 19,
    color: c.muted,
    fontStyle: 'italic',
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    color: c.onPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});
