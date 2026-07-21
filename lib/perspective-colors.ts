import { type Palette } from '@/constants/theme';

export type PerspectiveName = 'Left' | 'Center' | 'Right';

export type PerspectiveTone = {
  label: PerspectiveName;
  color: string;
  background: string;
};

/**
 * The single source of truth for political-perspective colors. Keeping this
 * outside individual screens prevents Center (or either side) from changing
 * color between search, summaries, articles, and forumAI.
 */
export function getPerspectiveTone(label: PerspectiveName, c: Palette): PerspectiveTone {
  if (label === 'Left') return { label, color: c.blue, background: c.blueBg };
  if (label === 'Right') return { label, color: c.red, background: c.redBg };
  return { label, color: c.centerTag, background: c.centerBg };
}

export function getPerspectiveToneForPosition(position: number | null, c: Palette): PerspectiveTone | null {
  if (position == null) return null;
  if (position < 0.4) return getPerspectiveTone('Left', c);
  if (position > 0.6) return getPerspectiveTone('Right', c);
  return getPerspectiveTone('Center', c);
}
