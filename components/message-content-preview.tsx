import AvatarVisual from '@/components/avatar-visual';
import DisplayName from '@/components/display-name';
import ContentLongPress from '@/components/content-long-press';
import { PerspectiveTag } from '@/components/perspectiveTag';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useContentInteraction } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { getPerspectiveToneForPosition } from '@/lib/perspective-colors';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tapLight } from '@/lib/haptics';

export type SharedPostPreview = {
  kind: 'post';
  id: string;
  text?: string | null;
  media_url?: string | null;
  position?: number | null;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  author_is_demo?: boolean;
};

export type SharedArticlePreview = {
  kind: 'article';
  id: string;
  title?: string | null;
  source?: string | null;
  media_url?: string | null;
  political_lean?: number | null;
  source_lean?: number | null;
  published_at?: string | null;
};

export type SharedContentPreview = SharedPostPreview | SharedArticlePreview;

type Props = {
  shared: SharedContentPreview;
};

export default function MessageContentPreview({ shared }: Props) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mediaFailed, setMediaFailed] = useState(false);
  const { state: interaction, patch: patchInteraction } = useContentInteraction(
    shared.kind,
    shared.id,
    { deleted: false },
  );

  useEffect(() => setMediaFailed(false), [shared.id, shared.media_url]);

  const open = () => {
    router.push(`/${shared.kind}/${shared.id}` as never);
  };

  if (shared.kind === 'post' && interaction.deleted) {
    return (
      <View style={styles.unavailableCard}>
        <ThemedText style={styles.unavailableText}>This shared post is no longer available.</ThemedText>
      </View>
    );
  }

  if (shared.kind === 'post') {
    return (
      <ContentLongPress
        preview={{
          kind: 'post',
          id: shared.id,
          authorId: shared.author_id,
          authorName: shared.author_name,
          authorAvatar: shared.author_avatar_url,
          authorIsDemo: shared.author_is_demo,
          text: shared.text ?? 'This post is no longer available.',
          media: shared.media_url,
          position: shared.position,
        }}
        onDeleted={() => patchInteraction({ deleted: true })}
      >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open post by ${shared.author_name}`}
        onPress={() => { tapLight(); open(); }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.postHeader}>
          <AvatarVisual
            userId={shared.author_id}
            avatarUrl={shared.author_avatar_url}
            isDemo={shared.author_is_demo}
            size={30}
          />
          <DisplayName
            username={shared.author_name}
            isDemo={shared.author_is_demo}
            nameStyle={styles.authorName}
            labelStyle={styles.demoLabel}
            numberOfLines={1}
          />
        </View>
        {!!shared.text && (
          <ThemedText style={styles.postText} numberOfLines={4}>
            {shared.text}
          </ThemedText>
        )}
        {!!shared.media_url && !mediaFailed && (
          <Image
            source={{ uri: shared.media_url }}
            style={styles.media}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`message-post:${shared.id}:${shared.media_url}`}
            onError={() => setMediaFailed(true)}
          />
        )}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>View post</ThemedText>
          <IconSymbol name="chevron.right" size={15} color={c.primary} />
        </View>
      </Pressable>
      </ContentLongPress>
    );
  }

  const tone = getPerspectiveToneForPosition(
    shared.source_lean ?? shared.political_lean ?? null,
    c,
  );

  return (
    <ContentLongPress
      preview={{
        kind: 'article',
        id: shared.id,
        title: shared.title ?? 'This article is no longer available.',
        source: shared.source ?? 'News article',
        media: shared.media_url,
        position: shared.source_lean ?? shared.political_lean ?? null,
      }}
    >
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open article from ${shared.source || 'publisher'}`}
      onPress={() => { tapLight(); open(); }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {!!shared.media_url && !mediaFailed ? (
        <Image
          source={{ uri: shared.media_url }}
          style={styles.articleMedia}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={`message-article:${shared.id}:${shared.media_url}`}
          onError={() => setMediaFailed(true)}
        />
      ) : (
        <View style={styles.articleFallback}>
          <IconSymbol name="newspaper.fill" size={24} color={c.primary} />
        </View>
      )}
      <View style={styles.articleCopy}>
        <View style={styles.sourceRow}>
          <ThemedText style={styles.source} numberOfLines={1}>
            {shared.source || 'News article'}
          </ThemedText>
          {tone ? <PerspectiveTag label={tone.label} /> : null}
        </View>
        <ThemedText style={styles.headline} numberOfLines={4}>
          {shared.title || 'This article is no longer available.'}
        </ThemedText>
      </View>
      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>View article</ThemedText>
        <IconSymbol name="chevron.right" size={15} color={c.primary} />
      </View>
    </Pressable>
    </ContentLongPress>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: {
    width: 270,
    maxWidth: '100%',
    overflow: 'hidden',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surfaceRaised,
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 11,
  },
  authorName: { maxWidth: 178, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  demoLabel: { maxWidth: 120, fontSize: 8, lineHeight: 10 },
  postText: {
    paddingHorizontal: 12,
    paddingTop: 9,
    color: c.text,
    fontSize: 14,
    lineHeight: 19,
  },
  media: { width: '100%', height: 132, marginTop: 11, backgroundColor: c.surfaceMuted },
  articleMedia: { width: '100%', height: 132, backgroundColor: c.surfaceMuted },
  articleFallback: {
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.card,
  },
  articleCopy: { paddingHorizontal: 12, paddingTop: 10 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  source: {
    flex: 1,
    color: c.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  headline: { marginTop: 6, color: c.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  footer: {
    minHeight: 35,
    marginTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { color: c.primary, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  unavailableCard: {
    width: 270,
    maxWidth: '100%',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: c.surfaceMuted,
  },
  unavailableText: { color: c.muted, fontSize: 14, lineHeight: 19, fontStyle: 'italic' },
});
