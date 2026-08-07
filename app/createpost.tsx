import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import QuotedContentCard from '@/components/quoted-content-card';
import { type Palette } from '@/constants/theme';
import { usePosts } from '@/context/postContext';
import { useInteractionController } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadImage } from '@/lib/api';
import { mapQuotedContent, quotedContentFromArticle, quotedContentFromPost } from '@/lib/quoted-content';
import type { QuotedContent } from '@/types/quoted-content';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export default function CreatePost() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ quote_kind?: string; quote_id?: string }>();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { refresh } = usePosts();
  const interactions = useInteractionController();
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [quotedContent, setQuotedContent] = useState<QuotedContent | null>(null);
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [quoteSource, setQuoteSource] = useState<'bookmarks' | 'upvoted' | 'posts'>('bookmarks');
  const [quoteChoices, setQuoteChoices] = useState<Record<string, QuotedContent[] | null>>({
    bookmarks: null,
    upvoted: null,
    posts: null,
  });
  const [initialQuoteLoading, setInitialQuoteLoading] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => inputRef.current?.focus());
      return () => task.cancel();
    }, []),
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const change = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(Math.max(0, event.endCoordinates.height));
    });
    const hide = Keyboard.addListener('keyboardWillHide', (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(0);
    });
    return () => {
      change.remove();
      hide.remove();
    };
  }, []);

  // Bring a freshly attached photo into view. Picking one refocuses the input,
  // so the keyboard stays up and the preview would otherwise land off-screen.
  useEffect(() => {
    if (!pickedImage) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [pickedImage]);

  const initialQuoteKey = `${routeParams.quote_kind ?? ''}:${routeParams.quote_id ?? ''}`;
  useEffect(() => {
    const kind = routeParams.quote_kind;
    const id = routeParams.quote_id;
    if ((kind !== 'post' && kind !== 'article') || !id) return;
    let cancelled = false;
    setInitialQuoteLoading(true);
    api<any>(kind === 'post' ? `/posts/${id}` : `/articles/${id}`)
      .then((row) => {
        if (cancelled) return;
        setQuotedContent(kind === 'post'
          ? mapQuotedContent({
              kind: 'post', id: row.id, available: true, author_id: row.user_id,
              username: row.username, avatar_url: row.avatar_url, is_demo: row.is_demo,
              text: row.content, media: row.media_url, position: row.position,
              created_at: row.created_at,
            })
          : quotedContentFromArticle(row));
      })
      .catch((error: any) => {
        if (!cancelled) setErr(error?.message ?? 'The quoted content could not be loaded.');
      })
      .finally(() => { if (!cancelled) setInitialQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [initialQuoteKey, routeParams.quote_id, routeParams.quote_kind]);

  const dismissComposer = useCallback(() => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const closeComposer = () => {
    tapLight();
    dismissComposer();
  };

  const choosePhoto = async () => {
    tapLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPickedImage({
        uri: asset.uri,
        width: asset.width ?? 1,
        height: asset.height ?? 1,
      });
      InteractionManager.runAfterInteractions(() => inputRef.current?.focus());
    }
  };

  const removePickedImage = () => {
    tapLight();
    setPickedImage(null);
    inputRef.current?.focus();
  };

  const removeQuote = () => {
    tapLight();
    setQuotedContent(null);
    inputRef.current?.focus();
  };

  const openQuotePicker = () => {
    tapLight();
    Keyboard.dismiss();
    setQuotePickerOpen(true);
  };

  const closeQuotePicker = () => {
    setQuotePickerOpen(false);
    InteractionManager.runAfterInteractions(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!quotePickerOpen || quoteChoices[quoteSource] !== null) return;
    let cancelled = false;
    setPickerLoading(true);
    const path = quoteSource === 'bookmarks'
      ? '/bookmarks'
      : quoteSource === 'upvoted'
        ? '/users/me/upvoted'
        : '/users/me/posts';
    api<any[]>(path)
      .then((rows) => {
        if (cancelled) return;
        const choices = quoteSource === 'posts'
          ? rows.map((row) => quotedContentFromPost(row))
          : rows.map((entry) => entry.kind === 'post'
              ? quotedContentFromPost(entry.item)
              : quotedContentFromArticle(entry.item));
        setQuoteChoices((current) => ({ ...current, [quoteSource]: choices }));
      })
      .catch((error: any) => {
        if (!cancelled) setErr(error?.message ?? 'Could not load content to quote.');
      })
      .finally(() => { if (!cancelled) setPickerLoading(false); });
    return () => { cancelled = true; };
  }, [quoteChoices, quotePickerOpen, quoteSource]);

  const chooseQuote = (choice: QuotedContent) => {
    setQuotedContent(choice);
    closeQuotePicker();
  };

  const canPost = !loading && Boolean(content.trim() || pickedImage || quotedContent);

  const handlePost = async () => {
    if (!canPost) return;
    setErr(null);
    tapMedium();
    setLoading(true);

    try {
      const mediaUrl = pickedImage ? await uploadImage(pickedImage.uri) : null;
      await api('/posts', {
        body: {
          content: content.trim(),
          media_url: mediaUrl,
          quoted_post_id: quotedContent?.kind === 'post' ? quotedContent.id : undefined,
          quoted_article_id: quotedContent?.kind === 'article' ? quotedContent.id : undefined,
        },
      });
      if (quotedContent) {
        interactions.update(quotedContent.kind, quotedContent.id, (current) => ({
          repostCount: (current.repostCount ?? 0) + 1,
        }));
      }
      await refresh();
      notifySuccess();
      dismissComposer();
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const mediaBar = (attachedToKeyboard: boolean) => (
    <View
      style={[
        styles.mediaBar,
        {
          paddingBottom: attachedToKeyboard
            ? 9
            : Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a photo from your library"
        onPress={choosePhoto}
        style={({ pressed }) => [styles.mediaButton, pressed && styles.mediaButtonPressed]}
      >
        <View style={styles.mediaIconBubble}>
          <IconSymbol name="photo" size={21} color={c.primary} />
        </View>
        <ThemedText style={styles.mediaButtonText}>Photo</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a post or article to quote"
        onPress={openQuotePicker}
        style={({ pressed }) => [styles.mediaButton, pressed && styles.mediaButtonPressed]}
      >
        <View style={styles.mediaIconBubble}>
          <IconSymbol name="quote.bubble" size={21} color={c.primary} />
        </View>
        <ThemedText style={styles.mediaButtonText}>Quote</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.topActions,
              {
                paddingTop: Platform.OS === 'ios'
                  ? 12
                  : insets.top + 8,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel post"
              disabled={loading}
              hitSlop={10}
              onPress={closeComposer}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Posting' : 'Post'}
              disabled={!canPost}
              onPress={handlePost}
              style={({ pressed }) => [
                styles.postButton,
                !canPost && styles.postButtonDisabled,
                pressed && canPost && styles.buttonPressed,
              ]}
            >
              <ThemedText style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
                {loading ? 'Posting…' : 'Post'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.editorScroll}
            // The media bar is pinned above the keyboard, so the scrollable
            // area has to clear both — otherwise an attached photo renders
            // underneath the keyboard with no way to scroll it into view.
            contentContainerStyle={[styles.editorContent, { paddingBottom: 104 + keyboardHeight }]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              ref={inputRef}
              accessibilityLabel="Post text"
              autoCapitalize="sentences"
              autoCorrect
              autoFocus
              multiline
              onChangeText={(text) => {
                setContent(text);
                if (err) setErr(null);
              }}
              placeholder="What do you want to post?"
              placeholderTextColor={c.muted}
              scrollEnabled={false}
              style={[styles.editor, quotedContent && styles.editorWithQuote]}
              textAlignVertical="top"
              value={content}
            />

            {pickedImage ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: pickedImage.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                  accessibilityLabel="Selected post image"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected image"
                  hitSlop={8}
                  onPress={removePickedImage}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.buttonPressed]}
                >
                  <IconSymbol name="xmark" size={17} color={c.onImage} />
                </Pressable>
              </View>
            ) : null}

            {initialQuoteLoading && !quotedContent ? (
              <View style={styles.quoteLoading}>
                <ActivityIndicator color={c.muted} />
                <ThemedText style={styles.quoteLoadingText}>Loading quote…</ThemedText>
              </View>
            ) : quotedContent ? (
              <View style={styles.quoteContainer}>
                <QuotedContentCard content={quotedContent} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove quoted content"
                  hitSlop={8}
                  onPress={removeQuote}
                  style={({ pressed }) => [styles.quoteRemove, pressed && styles.buttonPressed]}
                >
                  <IconSymbol name="xmark" size={16} color={c.onImage} />
                </Pressable>
              </View>
            ) : null}

            {err ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{err}</ThemedText>
              </View>
            ) : null}
          </ScrollView>

          {Platform.OS === 'ios' ? (
            <View style={[styles.iosMediaBarPosition, { bottom: keyboardHeight }]}>
              {mediaBar(keyboardHeight > 0)}
            </View>
          ) : mediaBar(false)}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={quotePickerOpen} transparent animationType="fade" onRequestClose={closeQuotePicker}>
        <Pressable style={styles.pickerBackdrop} onPress={() => { tapLight(); closeQuotePicker(); }}>
          <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <View style={styles.pickerHeaderCopy}>
                <ThemedText style={styles.pickerTitle}>Choose a post or article to quote</ThemedText>
                <ThemedText style={styles.pickerSubtitle}>Posts and articles you already know.</ThemedText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close quote picker" hitSlop={8} onPress={() => { tapLight(); closeQuotePicker(); }}>
                <IconSymbol name="xmark" size={22} color={c.text} />
              </Pressable>
            </View>
            <View style={styles.pickerTabs}>
              {([
                ['bookmarks', 'Bookmarks'],
                ['upvoted', 'Upvoted'],
                ['posts', 'Your Posts'],
              ] as const).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => { tapLight(); setQuoteSource(key); }}
                  style={[styles.pickerTab, quoteSource === key && styles.pickerTabActive]}
                >
                  <ThemedText style={[styles.pickerTabText, quoteSource === key && styles.pickerTabTextActive]}>{label}</ThemedText>
                </Pressable>
              ))}
            </View>
            {pickerLoading && quoteChoices[quoteSource] === null ? (
              <View style={styles.pickerLoading}><ActivityIndicator color={c.muted} /></View>
            ) : (
              <FlatList
                data={quoteChoices[quoteSource] ?? []}
                keyExtractor={(item) => `${item.kind}-${item.id}`}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <QuotedContentCard content={item} compact onPress={() => chooseQuote(item)} />
                )}
                ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
                ListEmptyComponent={(
                  <View style={styles.pickerEmpty}>
                    <ThemedText style={styles.pickerEmptyTitle}>Nothing here yet</ThemedText>
                    <ThemedText style={styles.pickerEmptyText}>
                      {quoteSource === 'bookmarks'
                        ? 'Bookmark a post or article and it will appear here.'
                        : quoteSource === 'upvoted'
                          ? 'Upvote a post or article and it will appear here.'
                          : 'Your posts will appear here after you publish them.'}
                    </ThemedText>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    padding: Platform.OS === 'web' ? 24 : 0,
    backgroundColor: Platform.OS === 'web' ? c.scrim : c.background,
  },
  safeArea: {
    flex: Platform.OS === 'web' ? undefined : 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 720 : undefined,
    height: Platform.OS === 'web' ? 'min(75vh, 760px)' as any : undefined,
    overflow: 'hidden',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    backgroundColor: c.background,
  },
  keyboardView: {
    flex: 1,
  },
  topActions: {
    minHeight: 58,
    paddingHorizontal: 18,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cancelText: {
    color: c.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  postButton: {
    minWidth: 76,
    minHeight: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  postButtonDisabled: {
    backgroundColor: c.surfaceMuted,
  },
  postButtonText: {
    color: c.onPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  postButtonTextDisabled: {
    color: c.textDisabled,
  },
  buttonPressed: {
    opacity: 0.66,
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 104,
  },
  editor: {
    flexGrow: 1,
    minHeight: 260,
    paddingTop: 12,
    paddingHorizontal: 0,
    paddingBottom: 20,
    color: c.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  editorWithQuote: {
    flexGrow: 0,
    minHeight: 150,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surfaceMuted,
  },
  quoteContainer: { width: '100%', position: 'relative', marginBottom: 16 },
  quoteRemove: {
    position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.imageControlBg,
  },
  quoteLoading: { minHeight: 72, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  quoteLoadingText: { color: c.muted, fontSize: 14, lineHeight: 19 },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.imageControlBg,
  },
  errorContainer: {
    marginBottom: 4,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.red,
    backgroundColor: c.redBg,
  },
  errorText: {
    color: c.danger,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  mediaBar: {
    minHeight: 64,
    paddingTop: 9,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iosMediaBarPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 4,
  },
  mediaButton: {
    minHeight: 44,
    paddingRight: 14,
    paddingLeft: 4,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaButtonPressed: {
    backgroundColor: c.accentSoftBg,
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
    backgroundColor: c.scrim,
  },
  pickerSheet: {
    width: '100%', maxWidth: Platform.OS === 'web' ? 720 : undefined,
    height: Platform.OS === 'web' ? 'min(76vh, 760px)' as any : '76%',
    maxHeight: 760, paddingTop: 12, paddingHorizontal: 16,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: c.cardBorder,
    backgroundColor: c.overlayCard,
  },
  pickerHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14, backgroundColor: c.faint },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingHorizontal: 4 },
  pickerHeaderCopy: { flex: 1 },
  pickerTitle: { color: c.text, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  pickerSubtitle: { marginTop: 2, color: c.muted, fontSize: 13, lineHeight: 18 },
  pickerTabs: { flexDirection: 'row', gap: 7, marginTop: 18, marginBottom: 14 },
  pickerTab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: c.surfaceMuted },
  pickerTabActive: { backgroundColor: c.accentSoftBg },
  pickerTabText: { color: c.muted, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  pickerTabTextActive: { color: c.primary },
  pickerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerList: { paddingBottom: 34 },
  pickerSeparator: { height: 10 },
  pickerEmpty: { paddingHorizontal: 24, paddingVertical: 64, alignItems: 'center' },
  pickerEmptyTitle: { color: c.text, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  pickerEmptyText: { marginTop: 7, color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  mediaIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoftBg,
  },
  mediaButtonText: {
    color: c.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
