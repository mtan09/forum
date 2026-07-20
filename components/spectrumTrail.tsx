import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

// A time axis for the ONE number. Deliberately minimal — no new metric,
// just the existing lean given a pulse: where the dot sat at each recent
// month-end, so a placement that has converged still shows its trajectory.
// y maps lean (top = right, bottom = left); x is time, left to right.
export type TrailPoint = { label: string; position: number; samples: number };

const H = 54;

function movement(points: TrailPoint[]): { text: string; color: string } | null {
  if (points.length < 2) return null;
  const delta = points[points.length - 1].position - points[0].position;
  if (Math.abs(delta) < 0.02) return { text: 'Holding steady', color: '#6B7280' };
  const pts = Math.round(Math.abs(delta) * 100);
  return delta > 0
    ? { text: `Drifted ${pts} pts right since ${points[0].label}`, color: '#DC2626' }
    : { text: `Drifted ${pts} pts left since ${points[0].label}`, color: '#2563EB' };
}

export default function SpectrumTrail({ points, width }: { points: TrailPoint[]; width: number }) {
  if (points.length < 2) return null;

  const n = points.length;
  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * (width - 12) + 6);
  const y = (p: number) => 6 + (1 - p) * (H - 12); // right = up

  const coords = points.map((pt, i) => `${x(i)},${y(pt.position)}`).join(' ');
  const move = movement(points);

  return (
    <ThemedView style={styles.wrap}>
      <ThemedView style={styles.headerRow}>
        <ThemedText style={styles.title}>Your trajectory</ThemedText>
        {move && <ThemedText style={[styles.move, { color: move.color }]}>{move.text}</ThemedText>}
      </ThemedView>

      <View style={{ width, height: H }}>
        <Svg width={width} height={H}>
          {/* center (0.5) reference */}
          <Line x1={0} y1={y(0.5)} x2={width} y2={y(0.5)} stroke="#E4DCFF" strokeWidth={1} strokeDasharray="4 4" />
          <Polyline points={coords} fill="none" stroke="#B647FF" strokeWidth={2.5} strokeLinejoin="round" />
          {points.map((pt, i) => (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(pt.position)}
              r={i === n - 1 ? 5 : 3}
              fill={i === n - 1 ? '#9A00FF' : '#FFFFFF'}
              stroke="#9A00FF"
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      <ThemedView style={styles.labels}>
        {points.map((pt, i) => (
          <ThemedText key={i} style={[styles.label, i === n - 1 && styles.labelNow]}>{pt.label}</ThemedText>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    gap: 4,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8D8D8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  move: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 11,
    color: '#8D8D8D',
    flex: 1,
    textAlign: 'center',
  },
  labelNow: {
    color: '#9A00FF',
    fontWeight: '800',
  },
});
