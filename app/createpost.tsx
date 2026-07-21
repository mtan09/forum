import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function CreatePost() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user } = useAuth();
  const { refresh } = usePosts();

  const info = user ? { username: user.username, avatar_url: user.avatar_url ?? null } : null;

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
      router.back();
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

  return(
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
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
          </ThemedView>

          {info && (
            <ThemedView style={styles.authorContainer}>
              {info.avatar_url && (
                <Image
                  source={{ uri: info.avatar_url }}
                  style={styles.avatar}
                />
              )}
              <ThemedText style={styles.authorName}>{info.username}</ThemedText>
            </ThemedView>
          )}

          <TextInput
            placeholder="What do you want to post?"
            value={post.content}
            onChangeText={(text) => setPost((prev) => ({ ...prev, content: text }))}
            autoCapitalize="sentences"
            keyboardType="default"
            multiline
            onSubmitEditing={Keyboard.dismiss}
            textAlignVertical="top"
            style={styles.input}
            placeholderTextColor={c.muted}
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
                <IconSymbol name="x.circle.fill" size={28} color={c.accent} />
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
              <IconSymbol name="photo" size={20} color={c.accent} />
              <ThemedText style={styles.secondaryButtonText}>Add Image</ThemedText>
            </Pressable>

            <ThemedView>
              {hashtags.length > 0 && (
                <View style={styles.tagChips}>
                  {hashtags.map((tag) => (
                    <Pressable key={tag} onPress={() => removeTag(tag)} style={styles.tagChip}>
                      <ThemedText style={styles.tagChipText}>#{tag}</ThemedText>
                      <IconSymbol name="x.circle.fill" size={16} color={c.accent} />
                    </Pressable>
                  ))}
                </View>
              )}
              <TextInput
                placeholder="Add hashtags (space to add)"
                value={tagInput}
                onChangeText={onTagInputChange}
                onSubmitEditing={() => { commitTag(tagInput); setTagInput(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.tagInput}
                placeholderTextColor={c.muted}
              />
            </ThemedView>
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.bottomContainer}>
          <Pressable
            onPress={handlePost}
            style={[
              styles.primaryButton,
              loading || (!post.content.trim() && !pickedImage) ? styles.primaryButtonDisabled : null
            ]}
            disabled={loading || (!post.content.trim() && !pickedImage)}
          >
            <ThemedText style={styles.primaryButtonText}>
              {loading ? 'Posting...' : 'Post'}
            </ThemedText>
            {!loading && <IconSymbol name="arrow.up.circle.fill" size={20} color="white" />}
          </Pressable>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 24,
    marginTop: 60,
  },
  headerTitle: {
    color: c.accent,
    fontWeight: '800',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    width: '100%',
    minHeight: 140,
    borderWidth: 2,
    borderColor: c.accentFaint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlignVertical: 'top',
    color: c.text,
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
    color: c.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  tagInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: c.accentFaint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
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
    color: c.accent,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: c.background,
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
    backgroundColor: c.accent,
  },
  primaryButtonDisabled: {
    backgroundColor: c.accentFaint,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});
