import AvatarVisual from '@/components/avatar-visual';
import ContentActions, { type DeleteResult, type ReportKind } from '@/components/contentActions';
import DisplayName from '@/components/display-name';
import { PerspectiveTag } from '@/components/perspectiveTag';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { getPerspectiveToneForPosition } from '@/lib/perspective-colors';
import type { RecommendationContext } from '@/lib/feed-events';
import { tapLight, tapMedium } from '@/lib/haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuotedContent } from '@/types/quoted-content';
import QuotedContentCard from '@/components/quoted-content-card';

export type LongPressPreviewData =
  | {
      kind: 'post';
      id: string;
      authorId: string;
      authorName: string;
      authorAvatar?: string | null;
      authorIsDemo?: boolean;
      text: string;
      media?: string | null;
      position?: number | null;
      quotedContent?: QuotedContent | null;
    }
  | {
      kind: 'article';
      id: string;
      title: string;
      source: string;
      media?: string | null;
      position?: number | null;
    }
  | {
      kind: 'comment';
      id: string;
      authorId: string;
      authorName: string;
      authorAvatar?: string | null;
      authorIsDemo?: boolean;
      text: string;
    };

type Props = {
  children: ReactNode;
  preview: LongPressPreviewData;
  recommendationContext?: RecommendationContext;
  onBlocked?: () => void;
  onNotInterested?: () => void;
  onDeleted?: (result: DeleteResult) => void;
};

export default function ContentLongPress({
  children,
  preview,
  recommendationContext,
  onBlocked,
  onNotInterested,
  onDeleted,
}: Props) {
  const { c, scheme } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => {
    tapMedium();
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);
  const longPress = useMemo(
    () => Gesture.LongPress()
      .minDuration(380)
      .maxDistance(16)
      .onStart(open)
      .runOnJS(true),
    [open],
  );

  const authorId = preview.kind === 'article' ? undefined : preview.authorId;
  const authorName = preview.kind === 'article' ? undefined : preview.authorName;

  return (
    <>
      <GestureDetector gesture={longPress}>
        <View collapsable={false}>{children}</View>
      </GestureDetector>
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <BlurView
            tint={scheme === 'dark' ? 'dark' : 'light'}
            intensity={Platform.OS === 'ios' ? 42 : 65}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            onPress={() => { tapLight(); close(); }}
            style={[styles.backdrop, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}
          >
            <Pressable style={styles.previewStack} onPress={(event) => event.stopPropagation()}>
              <PreviewCard preview={preview} />
              <ContentActions
                targetKind={preview.kind as ReportKind}
                targetId={preview.id}
                authorId={authorId}
                authorName={authorName}
                recommendationContext={recommendationContext}
                onBlocked={onBlocked}
                onNotInterested={onNotInterested}
                onDeleted={onDeleted}
                onDismiss={close}
                displayMode="inline"
              />
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function PreviewCard({ preview }: { preview: LongPressPreviewData }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (preview.kind === 'article') {
    const tone = getPerspectiveToneForPosition(preview.position ?? null, c);
    return (
      <View style={styles.previewCard}>
        {preview.media ? (
          <Image source={{ uri: preview.media }} style={styles.articleMedia} contentFit="cover" />
        ) : (
          <View style={styles.articleFallback}>
            <IconSymbol name="newspaper.fill" size={28} color={c.primary} />
          </View>
        )}
        <View style={styles.previewCopy}>
          <View style={styles.sourceRow}>
            <ThemedText style={styles.source} numberOfLines={1}>{preview.source}</ThemedText>
            {tone ? <PerspectiveTag label={tone.label} /> : null}
          </View>
          <ThemedText style={styles.articleTitle} numberOfLines={5}>{preview.title}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewCard}>
      <View style={styles.identityRow}>
        <AvatarVisual
          userId={preview.authorId}
          avatarUrl={preview.authorAvatar}
          isDemo={preview.authorIsDemo}
          size={preview.kind === 'comment' ? 34 : 42}
        />
        <DisplayName
          username={preview.authorName}
          isDemo={preview.authorIsDemo}
          nameStyle={styles.authorName}
          labelStyle={styles.demoLabel}
          numberOfLines={1}
        />
      </View>
      <ThemedText
        style={preview.kind === 'comment' ? styles.commentText : styles.postText}
        numberOfLines={preview.kind === 'comment' ? 8 : 7}
      >
        {preview.text}
      </ThemedText>
      {preview.kind === 'post' && preview.media ? (
        <Image source={{ uri: preview.media }} style={styles.postMedia} contentFit="cover" />
      ) : null}
      {preview.kind === 'post' && preview.quotedContent ? (
        <View style={styles.quotePreview}>
          <QuotedContentCard content={preview.quotedContent} compact />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  previewStack: {
    width: '100%',
    maxWidth: 520,
    gap: 12,
  },
  previewCard: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surfaceRaised,
    shadowColor: c.shadow,
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  previewCopy: { paddingHorizontal: 16, paddingVertical: 15 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  authorName: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  demoLabel: { fontSize: 8, lineHeight: 10 },
  postText: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 15, fontSize: 16, lineHeight: 22 },
  commentText: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 17, fontSize: 15, lineHeight: 21 },
  postMedia: { width: '100%', height: 190, backgroundColor: c.surfaceMuted },
  quotePreview: { paddingHorizontal: 14, paddingBottom: 14 },
  articleMedia: { width: '100%', height: 190, backgroundColor: c.surfaceMuted },
  articleFallback: { height: 118, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  source: {
    flex: 1,
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  articleTitle: { marginTop: 8, fontSize: 17, lineHeight: 23, fontWeight: '800' },
});
