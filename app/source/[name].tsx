import Article, { ArticleType } from '@/components/articleComponent';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { tapLight } from '@/lib/haptics';

type SourceInfo = {
  name: string;
  lean: number | null;
  stats: {
    total: number;
    last7: number;
    avg_lean: number | null;
    p25: number | null;
    p75: number | null;
    first_seen: string | null;
  };
  content_types: Record<string, number>;
  articles: ArticleType[];
};

function leanLabel(position: number): string {
  if (position < 0.35) return 'Left';
  if (position < 0.45) return 'Lean Left';
  if (position <= 0.55) return 'Center';
  if (position <= 0.65) return 'Lean Right';
  return 'Right';
}

// Same favicon trick the article cards use
function logoUrl(articleUrl: string | undefined): string | null {
  if (!articleUrl) return null;
  try {
    const domain = new URL(articleUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

const TYPE_LABELS: [string, string][] = [
  ['factual_report', 'Factual reporting'],
  ['news_report', 'News reporting'],
  ['analysis', 'Analysis'],
  ['opinion', 'Opinion'],
];

export default function SourceScreen() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const frameWidth = Platform.OS === 'web' ? Math.min(windowWidth, 760) : windowWidth;
  const { name } = useLocalSearchParams();
  const sourceName = useMemo(
    () => decodeURIComponent((Array.isArray(name) ? name[0] : name) ?? ''),
    [name]
  );
  const router = useRouter();

  const [info, setInfo] = useState<SourceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!sourceName) return;
    let active = true;
    api<SourceInfo>(`/sources/${encodeURIComponent(sourceName)}`)
      .then((data) => { if (active) setInfo(data); })
      .catch((err: any) => { if (active) setError(err?.message ?? 'Failed to load source'); });
    return () => { active = false; };
  }, [sourceName]);

  if (error) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Error: {error}</ThemedText>
      </ThemedView>
    );
  }
  if (!info) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading source…</ThemedText>
      </ThemedView>
    );
  }

  const logo = logoUrl(info.articles[0]?.url);
  const typeTotal = Object.values(info.content_types).reduce((a, b) => a + b, 0);
  const tracked = info.stats.first_seen
    ? new Date(info.stats.first_seen).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <WebPageFrame maxWidth={760}>
        <ThemedView style={styles.container}>
        {/* Outlet identity */}
        <ThemedView style={styles.headerRow}>
          {logo && !logoFailed ? (
            <Image source={{ uri: logo }} style={styles.logo} onError={() => setLogoFailed(true)} />
          ) : (
            <ThemedView style={[styles.logo, styles.logoFallback]}>
              <ThemedText style={styles.logoInitial}>{info.name.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
          )}
          <ThemedView style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={styles.sourceName}>{info.name}</ThemedText>
            {info.lean != null && (
              <ThemedText style={styles.leanText}>
                {leanLabel(info.lean)} outlet · rated {info.lean.toFixed(2)} on a 0–1 scale
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>

        {/* The detailed spectrum: the outlet's rating AND where its
            articles actually land under our scorer */}
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Outlet rating</ThemedText>
          <Spectrum width={Math.max(1, frameWidth - 64)} height={20} position={info.lean ?? 0.5} />
          <ThemedText style={styles.cardNote}>
            Hand-mapped from published media-bias ratings (AllSides / Ad Fontes).
          </ThemedText>

          {info.stats.avg_lean != null && (
            <>
              <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { marginTop: 10 }]}>
                How its articles score here
              </ThemedText>
              <Spectrum width={Math.max(1, frameWidth - 64)} height={20} position={info.stats.avg_lean} />
              <ThemedText style={styles.cardNote}>
                Average article score: {info.stats.avg_lean.toFixed(2)}
                {info.stats.p25 != null && info.stats.p75 != null
                  ? ` — the middle half of its articles score ${info.stats.p25.toFixed(2)}–${info.stats.p75.toFixed(2)}`
                  : ''}. Scored per-article by the app&apos;s deterministic lexicon scorer.
              </ThemedText>
            </>
          )}
        </ThemedView>

        {/* Reporting vs opinion mix */}
        {typeTotal > 0 && (
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Content mix</ThemedText>
            {TYPE_LABELS.filter(([key]) => info.content_types[key]).map(([key, label]) => {
              const pct = Math.round((info.content_types[key] / typeTotal) * 100);
              return (
                <ThemedView key={key} style={styles.mixRow}>
                  <ThemedText style={styles.mixLabel}>{label}</ThemedText>
                  <ThemedView style={styles.mixBarTrack}>
                    <ThemedView style={[styles.mixBarFill, { width: `${Math.max(pct, 2)}%` }]} />
                  </ThemedView>
                  <ThemedText style={styles.mixPct}>{pct}%</ThemedText>
                </ThemedView>
              );
            })}
          </ThemedView>
        )}

        {/* Volume */}
        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.stat}>
            <ThemedText style={styles.statValue}>{info.stats.total}</ThemedText>
            <ThemedText style={styles.statLabel}>articles</ThemedText>
          </ThemedView>
          <ThemedView style={styles.stat}>
            <ThemedText style={styles.statValue}>{info.stats.last7}</ThemedText>
            <ThemedText style={styles.statLabel}>this week</ThemedText>
          </ThemedView>
          {tracked && (
            <ThemedView style={styles.stat}>
              <ThemedText style={styles.statValue}>{tracked}</ThemedText>
              <ThemedText style={styles.statLabel}>tracked since</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.recentHeader}>
        <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>Recent coverage</ThemedText>
      </ThemedView>
      {info.articles.map((article) => (
        <Pressable
          key={article.id}
          onPress={() => { tapLight(); router.push(`/article/${article.id}`); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
        >
          <Article article={article} />
        </Pressable>
      ))}
      <ThemedView style={{ height: 32 }} />
      </WebPageFrame>
    </ScrollView>
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
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  logoFallback: {
    backgroundColor: c.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: c.onAccentFaint,
    lineHeight: 34,
  },
  sourceName: {
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 30,
  },
  leanText: {
    color: c.subtle,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontWeight: '800',
  },
  cardNote: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  mixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  mixLabel: {
    width: 120,
    fontSize: 13,
    fontWeight: '600',
  },
  mixBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.barTrack,
    overflow: 'hidden',
  },
  mixBarFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  mixPct: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    color: c.subtle,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    paddingVertical: 12,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statValue: {
    fontWeight: '800',
    fontSize: 16,
  },
  statLabel: {
    color: c.muted,
    fontSize: 12,
  },
  recentHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
});
