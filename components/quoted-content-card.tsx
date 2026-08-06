import AvatarVisual from '@/components/avatar-visual';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { tapLight } from '@/lib/haptics';
import type { QuotedContent } from '@/types/quoted-content';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  content: QuotedContent;
  onPress?: () => void;
  compact?: boolean;
};

export default function QuotedContentCard({ content, onPress, compact = false }: Props) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const open = () => {
    tapLight();
    if (onPress) onPress();
    else router.push(content.kind === 'post' ? `/post/${content.id}` : `/article/${content.id}`);
  };

  if (!content.available) {
    return (
      <View style={[styles.card, styles.unavailable]}>
        <IconSymbol name="eye.slash" size={18} color={c.muted} />
        <ThemedText style={styles.unavailableText}>
          This {content.kind} is no longer available.
        </ThemedText>
      </View>
    );
  }

  if (content.kind === 'article') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open quoted article from ${content.source ?? 'publisher'}`}
        onPress={open}
        style={({ pressed }) => [styles.card, styles.articleCard, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <View style={styles.labelRow}>
            <IconSymbol name="newspaper.fill" size={14} color={c.primary} />
            <ThemedText style={styles.label} numberOfLines={1}>{content.source || 'Article'}</ThemedText>
          </View>
          <ThemedText style={[styles.title, compact && styles.compactTitle]} numberOfLines={compact ? 2 : 4}>
            {content.title}
          </ThemedText>
        </View>
        {content.media ? (
          <Image source={{ uri: content.media }} style={styles.thumbnail} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.thumbnailFallback}>
            <IconSymbol name="newspaper.fill" size={22} color={c.primary} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open quoted post by ${content.username ?? 'user'}`}
      onPress={open}
      style={({ pressed }) => [styles.card, styles.postCard, pressed && styles.pressed]}
    >
      <View style={styles.authorRow}>
        <AvatarVisual
          userId={content.authorId ?? content.id}
          avatarUrl={content.avatarUrl}
          isDemo={content.isDemo}
          size={30}
        />
        <ThemedText style={styles.author} numberOfLines={1}>
          {content.username || 'forum user'}
          {content.isDemo ? <ThemedText style={styles.demo}> (Fictional demo account)</ThemedText> : null}
        </ThemedText>
      </View>
      {content.text ? (
        <ThemedText style={styles.postText} numberOfLines={compact ? 2 : 5}>{content.text}</ThemedText>
      ) : null}
      {content.media ? (
        <Image source={{ uri: content.media }} style={styles.postMedia} contentFit="cover" cachePolicy="memory-disk" />
      ) : null}
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: 17,
    backgroundColor: c.surface,
  },
  pressed: { opacity: 0.68 },
  unavailable: {
    minHeight: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  unavailableText: { flex: 1, color: c.muted, fontSize: 14, lineHeight: 19 },
  articleCard: { minHeight: 94, flexDirection: 'row' },
  copy: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, color: c.muted, fontSize: 11, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 6, color: c.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  compactTitle: { fontSize: 14, lineHeight: 19 },
  thumbnail: { width: 98, minHeight: 94, backgroundColor: c.surfaceMuted },
  thumbnailFallback: { width: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card },
  postCard: { paddingHorizontal: 14, paddingVertical: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  author: { flex: 1, color: c.text, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  demo: { color: c.muted, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  postText: { marginTop: 9, color: c.text, fontSize: 14, lineHeight: 20 },
  postMedia: { width: '100%', height: 145, marginTop: 11, borderRadius: 12, backgroundColor: c.surfaceMuted },
});
