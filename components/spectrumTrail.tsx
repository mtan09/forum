import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useMemo } from 'react';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

// A time axis for the ONE number. Deliberately minimal — no new metric,
// just the existing lean given a pulse: where the dot sat at each recent
// month-end, so a placement that has converged still shows its trajectory.
// y maps lean (top = right, bottom = left); x is time, left to right.
export type TrailPoint = { label: string; position: number; samples: number };

const H = 54;

function movement(points: TrailPoint[], c: Palette): { text: string; color: string } | null {
  if (points.length < 2) return null;
  const delta = points[points.length - 1].position - points[0].position;
  if (Math.abs(delta) < 0.02) return { text: 'Holding steady', color: c.subtle };
  const pts = Math.round(Math.abs(delta) * 100);
  return delta > 0
    ? { text: `Drifted ${pts} pts right since ${points[0].label}`, color: c.red }
    : { text: `Drifted ${pts} pts left since ${points[0].label}`, color: c.blue };
}

export default function SpectrumTrail({ points, width }: { points: TrailPoint[]; width: number }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  if (points.length < 2) return null;

  const n = points.length;
  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * (width - 12) + 6);
  const y = (p: number) => 6 + (1 - p) * (H - 12); // right = up

  const coords = points.map((pt, i) => `${x(i)},${y(pt.position)}`).join(' ');
  const move = movement(points, c);

  return (
    <ThemedView style={styles.wrap}>
      <ThemedView style={styles.headerRow}>
        <ThemedText style={styles.title}>Your trajectory</ThemedText>
        {move && <ThemedText style={[styles.move, { color: move.color }]}>{move.text}</ThemedText>}
      </ThemedView>

      <View style={{ width, height: H }}>
        <Svg width={width} height={H}>
          {/* center (0.5) reference */}
          <Line x1={0} y1={y(0.5)} x2={width} y2={y(0.5)} stroke={c.cardBorder} strokeWidth={1} strokeDasharray="4 4" />
          <Polyline points={coords} fill="none" stroke={c.primary} strokeWidth={2.5} strokeLinejoin="round" />
          {points.map((pt, i) => (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(pt.position)}
              r={i === n - 1 ? 5 : 3}
              fill={i === n - 1 ? c.accentDeep : c.card}
              stroke={c.accentDeep}
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

const makeStyles = (c: Palette) => StyleSheet.create({
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
    color: c.muted,
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
    color: c.muted,
    flex: 1,
    textAlign: 'center',
  },
  labelNow: {
    color: c.accentDeep,
    fontWeight: '800',
  },
});
