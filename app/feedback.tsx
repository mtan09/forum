import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadFeedbackScreenshot } from '@/lib/api';
import { getLastProductRoute } from '@/lib/route-context';
import { notifySuccess, selectTick, tapLight } from '@/lib/haptics';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

const CATEGORIES = [
  ['bug', 'Bug'],
  ['ui', 'Design'],
  ['performance', 'Performance'],
  ['content', 'Content'],
  ['idea', 'Idea'],
  ['other', 'Other'],
] as const;

type Category = (typeof CATEGORIES)[number][0];

export default function FeedbackScreen() {
  const { c, scheme } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const chooseScreenshot = async () => {
    tapLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled) setScreenshotUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (message.trim().length < 3 || sending) return;
    setSending(true);
    try {
      const screenshotKey = screenshotUri
        ? await uploadFeedbackScreenshot(screenshotUri)
        : null;
      await api('/feedback', {
        body: {
          category,
          message: message.trim(),
          screenshot_key: screenshotKey,
          route: getLastProductRoute(),
          theme: scheme,
          app_version: Constants.nativeAppVersion ?? Constants.expoConfig?.version,
          build_number: Constants.nativeBuildVersion,
          platform: Platform.OS,
          os_version: String(Platform.Version),
          device_model: Device.modelName,
          metadata: {
            device_brand: Device.brand,
            manufacturer: Device.manufacturer,
            is_device: Device.isDevice,
          },
        },
      });
      notifySuccess();
      Alert.alert('Feedback sent', 'Thank you — this is now in the review queue.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Could not send feedback', err?.message ?? 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={styles.title}>Help improve forum</ThemedText>
      <ThemedText style={styles.subtitle}>
        Tell us what happened and what you expected. Version and device details are attached automatically.
      </ThemedText>

      <ThemedView style={styles.categoryGrid}>
        {CATEGORIES.map(([value, label]) => {
          const selected = category === value;
          return (
            <Pressable
              key={value}
              onPress={() => {
                selectTick();
                setCategory(value);
              }}
              style={[styles.category, selected && styles.categorySelected]}
            >
              <ThemedText style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      <ThemedView style={styles.inputGroup}>
        <AppTextInput
          value={message}
          onChangeText={setMessage}
          placeholder="What happened? What would make this better?"
          multiline
          maxLength={5000}
          textAlignVertical="top"
          containerStyle={styles.feedbackInput}
          style={styles.feedbackInputText}
        />
        <ThemedText style={styles.counter}>{message.length}/5000</ThemedText>
      </ThemedView>

      {screenshotUri ? (
        <ThemedView style={styles.screenshotCard}>
          <Image source={{ uri: screenshotUri }} style={styles.screenshot} />
          <Pressable onPress={() => setScreenshotUri(null)} style={styles.removeButton}>
            <IconSymbol name="xmark" size={15} color={c.onPrimary} />
          </Pressable>
        </ThemedView>
      ) : (
        <Pressable onPress={chooseScreenshot} style={styles.attachButton}>
          <IconSymbol name="photo" size={18} color={c.primary} />
          <ThemedText style={styles.attachText}>Attach a screenshot (optional)</ThemedText>
        </Pressable>
      )}

      <Pressable
        disabled={message.trim().length < 3 || sending}
        onPress={submit}
        style={[
          styles.submitButton,
          (message.trim().length < 3 || sending) && styles.submitDisabled,
        ]}
      >
        {sending ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <ThemedText style={styles.submitText}>Send feedback</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, paddingBottom: 44, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
    title: { color: c.primary, fontSize: 28, lineHeight: 34, fontWeight: '900' },
    subtitle: { color: c.subtle, fontSize: 14, lineHeight: 20, marginTop: -8 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: 'transparent' },
    category: { borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
    categorySelected: { borderColor: c.primary, backgroundColor: c.accentFaint },
    categoryText: { color: c.subtle, fontSize: 13, fontWeight: '700' },
    categoryTextSelected: { color: c.onAccentFaint, fontWeight: '900' },
    inputGroup: { gap: 6, backgroundColor: 'transparent' },
    feedbackInput: { minHeight: 170, alignItems: 'flex-start' },
    feedbackInputText: { minHeight: 146, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
    counter: { color: c.muted, fontSize: 12, textAlign: 'right', marginTop: 8 },
    attachButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    attachText: { color: c.primary, fontWeight: '800' },
    screenshotCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.cardBorder },
    screenshot: { width: '100%', aspectRatio: 9 / 16, resizeMode: 'contain', backgroundColor: c.inputBg },
    removeButton: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    submitButton: { minHeight: 52, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    submitDisabled: { opacity: 0.45 },
    submitText: { color: c.onPrimary, fontWeight: '900', fontSize: 16 },
  });
