import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function CreatePost() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { refresh } = usePosts();

  const [post, setPost] = useState<{
    content: string;
    media: string | null;
  }>({
    content: '',
    media: null,
  })

  // Author-selected hashtags; a space/comma/return commits the typed tag
  // as a chip. The server also picks up any inline #tags in the text.
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const commitTag = (raw: string) => {
    const tag = raw.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (tag.length >= 2 && tag.length <= 30 && !hashtags.includes(tag) && hashtags.length < 8) {
      setHashtags((prev) => [...prev, tag]);
    }
  };

  const onTagInputChange = (text: string) => {
    if (/[ ,]$/.test(text)) {
      commitTag(text.slice(0, -1));
      setTagInput('');
    } else {
      setTagInput(text);
    }
  };

  const removeTag = (tag: string) => setHashtags((prev) => prev.filter((t) => t !== tag));

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handlePost = async () => {
    setErr(null);
    try {
      tapMedium();
      setLoading(true);

      let mediaUrl: string | null = null;
      if (pickedImage) {
        mediaUrl = await uploadImage(pickedImage.uri);
      }

      await api('/posts', {
        body: {
          content: post.content.trim(),
          media_url: mediaUrl,
          hashtags: tagInput ? [...hashtags, tagInput] : hashtags,
        },
      });

      await refresh();

      // reset UI and dismiss the modal back to the feed
      setPost({ content: '', media: null });
      setHashtags([]);
      setTagInput('');
      setPickedImage(null);
      notifySuccess();
      dismissComposer();
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const [pickedImage, setPickedImage] = useState<{ uri: string; width: number; height: number } | null>(null);

  const pickImage = async () => {
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
    }
  };

  const removePickedImage = () => setPickedImage(null);
  const canPost = !loading && Boolean(post.content.trim() || pickedImage);

  const dismissComposer = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const closeComposer = () => {
    tapLight();
    dismissComposer();
  };

  return(
    <Pressable style={styles.backdrop} onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>Create Post</ThemedText>
            <Pressable
              onPress={closeComposer}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.65 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Close create post"
              hitSlop={8}
            >
              <IconSymbol name="xmark" size={22} color={c.textSecondary} />
            </Pressable>
          </ThemedView>

          <AppTextInput
            placeholder="What do you want to post?"
            value={post.content}
            onChangeText={(text) => setPost((prev) => ({ ...prev, content: text }))}
            autoCapitalize="sentences"
            keyboardType="default"
            multiline
            onSubmitEditing={Keyboard.dismiss}
            textAlignVertical="top"
            containerStyle={styles.postInput}
            style={styles.postInputText}
          />

          {pickedImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: pickedImage.uri }}
                style={{
                  width: '100%',
                  aspectRatio: pickedImage.width / pickedImage.height,
                  borderRadius: 16,
                }}
                resizeMode="cover"
              />
              <Pressable onPress={removePickedImage} style={styles.removeButton}>
                <IconSymbol name="x.circle.fill" size={28} color={c.primary} />
              </Pressable>
            </View>
          )}

          {!!err && (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{err}</ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.actionContainer}>
            <Pressable onPress={pickImage} style={styles.secondaryButton}>
              <IconSymbol name="photo" size={20} color={c.primary} />
              <ThemedText style={styles.secondaryButtonText}>Add Image</ThemedText>
            </Pressable>

            <ThemedView style={styles.tagSection}>
              {hashtags.length > 0 && (
                <View style={styles.tagChips}>
                  {hashtags.map((tag) => (
                    <Pressable key={tag} onPress={() => removeTag(tag)} style={styles.tagChip}>
                      <ThemedText style={styles.tagChipText}>#{tag}</ThemedText>
                      <IconSymbol name="x.circle.fill" size={16} color={c.primary} />
                    </Pressable>
                  ))}
                </View>
              )}
              <AppTextInput
                placeholder="Add hashtags (space to add)"
                value={tagInput}
                onChangeText={onTagInputChange}
                onSubmitEditing={() => { commitTag(tagInput); setTagInput(''); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.bottomContainer}>
          <Pressable
            onPress={handlePost}
            style={[
              styles.primaryButton,
              !canPost ? styles.primaryButtonDisabled : null
            ]}
            disabled={!canPost}
          >
            <ThemedText style={[styles.primaryButtonText, !canPost && styles.primaryButtonTextDisabled]}>
              {loading ? 'Posting...' : 'Post'}
            </ThemedText>
            {!loading && <IconSymbol name="paperplane.fill" size={19} color={canPost ? c.onPrimary : c.textDisabled} />}
          </Pressable>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    padding: Platform.OS === 'web' ? 24 : 0,
    backgroundColor: Platform.OS === 'web' ? c.scrim : c.surfaceRaised,
  },
  container: {
    flex: Platform.OS === 'web' ? undefined : 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : undefined,
    height: Platform.OS === 'web' ? 'min(560px, calc(100vh - 48px))' as any : undefined,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    overflow: 'hidden',
    backgroundColor: c.surfaceRaised,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingTop: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: Platform.OS === 'web' ? 0 : 26,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: c.primary,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
    transform: [{ translateY: Platform.OS === 'web' ? 0 : -3 }],
  },
  postInput: {
    width: '100%',
    minHeight: 140,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  postInputText: {
    minHeight: 116,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: c.background,
    borderRadius: 16,
    padding: 4,
  },
  errorContainer: {
    backgroundColor: c.redBg,
    borderColor: c.red,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: c.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  actionContainer: {
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  tagSection: {
    backgroundColor: 'transparent',
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.accentFaint,
  },
  tagChipText: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.accentFaint,
    backgroundColor: c.card,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: c.primary,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: c.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: c.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: c.surfaceMuted,
  },
  primaryButtonText: {
    color: c.onPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  primaryButtonTextDisabled: {
    color: c.textDisabled,
  },
});
