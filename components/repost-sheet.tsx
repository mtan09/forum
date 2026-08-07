import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useContentInteraction } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, tapLight } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: 'post' | 'article';
  id: string;
  initialCount: number;
  initiallyReposted: boolean;
};

export default function RepostSheet({
  visible,
  onClose,
  kind,
  id,
  initialCount,
  initiallyReposted,
}: Props) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [saving, setSaving] = useState(false);
  const { state, getCurrent, patch } = useContentInteraction(kind, id, {
    repostCount: initialCount,
    reposted: initiallyReposted,
  });

  const toggleRepost = async () => {
    if (saving) return;
    tapLight();
    const previous = getCurrent();
    const nextReposted = !state.reposted;
    patch({
      reposted: nextReposted,
      repostCount: Math.max(0, (state.repostCount ?? 0) + (nextReposted ? 1 : -1)),
    });
    setSaving(true);
    onClose();
    try {
      const response = await api<{ reposted: boolean; repost_count: number }>('/reposts/toggle', {
        body: kind === 'post' ? { post_id: id } : { article_id: id },
      });
      patch({ reposted: response.reposted, repostCount: response.repost_count });
      notifySuccess();
    } catch (error: any) {
      patch({ reposted: previous.reposted, repostCount: previous.repostCount });
      Alert.alert('Could not update repost', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const quote = () => {
    tapLight();
    onClose();
    router.push({ pathname: '/createpost', params: { quote_kind: kind, quote_id: id } });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => onClose()}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={toggleRepost}>
            <View style={styles.iconBubble}>
              <IconSymbol name="arrow.2.squarepath" size={21} color={state.reposted ? c.primary : c.text} />
            </View>
            <View style={styles.copy}>
              <ThemedText style={styles.title}>{state.reposted ? 'Undo repost' : 'Repost'}</ThemedText>
              <ThemedText style={styles.subtitle}>Share it directly with people who follow you.</ThemedText>
            </View>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={quote}>
            <View style={styles.iconBubble}>
              <IconSymbol name="quote.bubble" size={21} color={c.text} />
            </View>
            <View style={styles.copy}>
              <ThemedText style={styles.title}>Quote</ThemedText>
              <ThemedText style={styles.subtitle}>Add your own perspective before sharing.</ThemedText>
            </View>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.cancel, pressed && styles.pressed]} onPress={() => { tapLight(); onClose(); }}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
    backgroundColor: c.scrim,
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    backgroundColor: c.overlayCard,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, marginBottom: 12, borderRadius: 2, backgroundColor: c.faint },
  action: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  pressed: { opacity: 0.58 },
  iconBubble: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted },
  copy: { flex: 1 },
  title: { color: c.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  subtitle: { marginTop: 2, color: c.muted, fontSize: 13, lineHeight: 18 },
  cancel: { minHeight: 48, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: c.surfaceMuted },
  cancelText: { color: c.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
});
