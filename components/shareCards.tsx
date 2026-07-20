import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// Fixed-size branded cards rendered for image capture (see ShareCardModal).
// Self-contained — no theme context, no external width — so the captured
// PNG looks identical on every device.
const CARD_W = 320;
const TRACK_W = CARD_W - 48;

function MiniSpectrum({ position, highlight = '#FFFFFF' }: { position: number; highlight?: string }) {
  return (
    <View style={{ width: TRACK_W }}>
      <View style={styles.trackWrap}>
        <LinearGradient
          colors={['#2563EB', '#8B5CF6', '#EF4444']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        />
        <View style={[styles.pin, { left: position * TRACK_W - 6, borderColor: highlight }]} />
      </View>
      <View style={styles.trackLabels}>
        <ThemedText style={styles.trackLabel}>Left</ThemedText>
        <ThemedText style={styles.trackLabel}>Right</ThemedText>
      </View>
    </View>
  );
}

function Brand() {
  return (
    <View style={styles.brandRow}>
      <ThemedText style={styles.brand}>forum</ThemedText>
      <ThemedText style={styles.brandTag}>see the whole spectrum</ThemedText>
    </View>
  );
}

// A user's placement on the single political spectrum.
export function LeanShareCard({
  username,
  position,
  label,
  sample,
}: {
  username: string;
  position: number;
  label: string;
  sample: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: '#0E0A1F' }]}>
      <ThemedText style={styles.eyebrow}>MY POLITICAL LEAN</ThemedText>
      <ThemedText style={styles.bigLabel}>{label}</ThemedText>
      <MiniSpectrum position={position} />
      <ThemedText style={styles.sample}>{sample}</ThemedText>
      <ThemedText style={styles.attribution}>@{username} · earned from real activity, not self-declared</ThemedText>
      <Brand />
    </View>
  );
}

// A user's committed stance in a Floor room.
export function StanceShareCard({
  title,
  position,
  median,
  voices,
}: {
  title: string;
  position: number;
  median: number | null;
  voices: number;
}) {
  const side = position < 0.45 ? 'the left' : position > 0.55 ? 'the right' : 'the center';
  return (
    <View style={[styles.card, { backgroundColor: '#1A0A22' }]}>
      <ThemedText style={styles.eyebrow}>I TOOK A STANCE ON THE FLOOR</ThemedText>
      <ThemedText style={styles.stanceTitle} numberOfLines={4}>{title}</ThemedText>
      <MiniSpectrum position={position} highlight="#F1C40F" />
      <ThemedText style={styles.sample}>
        I stood with {side}
        {median != null ? ` · the room's median landed at ${median.toFixed(2)}` : ''}
      </ThemedText>
      <ThemedText style={styles.attribution}>{voices} voice{voices === 1 ? '' : 's'} in this room</ThemedText>
      <Brand />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    padding: 24,
    borderRadius: 20,
    gap: 14,
  },
  eyebrow: {
    color: '#B98CFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bigLabel: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  stanceTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  trackWrap: {
    height: 24,
    justifyContent: 'center',
  },
  track: {
    width: TRACK_W,
    height: 14,
    borderRadius: 7,
  },
  pin: {
    position: 'absolute',
    width: 12,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  trackLabel: {
    color: '#8A7CA8',
    fontSize: 11,
    fontWeight: '700',
  },
  sample: {
    color: '#D6C9EC',
    fontSize: 14,
    lineHeight: 20,
  },
  attribution: {
    color: '#8A7CA8',
    fontSize: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  brand: {
    color: '#B647FF',
    fontSize: 22,
    fontWeight: '900',
  },
  brandTag: {
    color: '#6E6088',
    fontSize: 11,
    fontWeight: '600',
  },
});
