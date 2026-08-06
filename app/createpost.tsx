import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
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
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { refresh } = usePosts();
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  const canPost = !loading && Boolean(content.trim() || pickedImage);

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
        },
      });
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
            style={styles.editorScroll}
            contentContainerStyle={styles.editorContent}
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
              style={styles.editor}
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
