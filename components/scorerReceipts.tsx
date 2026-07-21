import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Spectrum from '@/components/spectrum';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useMemo } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

// The deterministic scorer records every signal that produced a
// placement (posts.position_signals / articles.lean_signals). This modal
// parses those strings back into plain language: no black box, receipts
// for every dot. Signal grammar, by prefix:
//   scorer:<version>       loaded:"phrase"×N      quotes:NN%
//   confidence:0.NN        left:"phrase"×N        subjectivity:0.NN
//   prior:0.NN             right:"phrase"×N       type:content_type(...)
type Framing = { side: 'left' | 'right' | 'loaded'; phrase: string; count: number };

type Parsed = {
  version?: string;
  confidence?: number;
  prior?: number;
  contentType?: string;
  subjectivity?: number;
  quotes?: string;
  framing: Framing[];
};

const PHRASE_RE = /^(left|right|loaded):"(.+)"×(\d+)$/;

function parse(signals: string[]): Parsed {
  const out: Parsed = { framing: [] };
  for (const raw of signals) {
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
  return out;
}

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
  const parsed = parse(signals);
  const leanHits = parsed.framing.filter((f) => f.side === 'left' || f.side === 'right');
  const loadedHits = parsed.framing.filter((f) => f.side === 'loaded');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedView style={styles.header}>
              <IconSymbol name="checkmark.seal.fill" size={20} color={c.accent} />
              <ThemedText type="defaultSemiBold" style={styles.title}>Why this placement?</ThemedText>
            </ThemedView>

            <Spectrum width={screenWidth - 64} height={20} position={position} />
            <ThemedText style={styles.band}>{bandLabel(position)}</ThemedText>

            {/* Source prior — articles start from their outlet's rating */}
            {kind === 'article' && parsed.prior != null && (
              <ThemedView style={styles.block}>
                <ThemedText style={styles.blockLabel}>Started from the outlet</ThemedText>
                <ThemedText style={styles.blockBody}>
                  This source&apos;s baseline rating is {bandLabel(parsed.prior).toLowerCase()} ({parsed.prior.toFixed(2)}).
                  The text below moved it from there.
                </ThemedText>
              </ThemedView>
            )}

            {/* Framing phrases that actually shifted the score */}
            {leanHits.length > 0 ? (
              <ThemedView style={styles.block}>
                <ThemedText style={styles.blockLabel}>The words that moved it</ThemedText>
                <ThemedView style={styles.chips}>
                  {leanHits.map((f, i) => (
                    <ThemedView
                      key={i}
                      style={[styles.chip, f.side === 'left' ? styles.chipLeft : styles.chipRight]}
                    >
                      <ThemedText style={[styles.chipText, f.side === 'left' ? styles.chipTextLeft : styles.chipTextRight]}>
                        {f.phrase}{f.count > 1 ? ` ×${f.count}` : ''}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              </ThemedView>
            ) : (
              <ThemedView style={styles.block}>
                <ThemedText style={styles.blockLabel}>No partisan language detected</ThemedText>
                <ThemedText style={styles.blockBody}>
                  Nothing in the text leaned the score either way, so it sits at center by default.
                </ThemedText>
              </ThemedView>
            )}

            {/* Loaded / editorializing language (informs content type) */}
            {loadedHits.length > 0 && (
              <ThemedView style={styles.block}>
                <ThemedText style={styles.blockLabel}>Loaded language</ThemedText>
                <ThemedView style={styles.chips}>
                  {loadedHits.map((f, i) => (
                    <ThemedView key={i} style={[styles.chip, styles.chipLoaded]}>
                      <ThemedText style={[styles.chipText, styles.chipTextLoaded]}>
                        {f.phrase}{f.count > 1 ? ` ×${f.count}` : ''}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>
              </ThemedView>
            )}

            {/* Fact row */}
            <ThemedView style={styles.facts}>
              {parsed.contentType && (
                <ThemedView style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Read as</ThemedText>
                  <ThemedText style={styles.factVal}>{prettyType(parsed.contentType)}</ThemedText>
                </ThemedView>
              )}
              {parsed.confidence != null && (
                <ThemedView style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Confidence</ThemedText>
                  <ThemedText style={styles.factVal}>{Math.round(parsed.confidence * 100)}%</ThemedText>
                </ThemedView>
              )}
              {parsed.quotes && (
                <ThemedView style={styles.factRow}>
                  <ThemedText style={styles.factKey}>Quoted material</ThemedText>
                  <ThemedText style={styles.factVal}>{parsed.quotes}</ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            <ThemedText style={styles.footer}>
              Scored deterministically by {parsed.version ?? 'the forum scorer'} — no AI, no black box.
              The same text always produces the same placement.
            </ThemedText>

            <Pressable style={styles.closeBtn} onPress={onClose}>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.overlayCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
