import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { tapMedium } from '@/lib/haptics';
import { useMemo, useRef } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Wraps any card in a capture-to-image + native share flow. The app has no
// other way for a user's activity to leave the app, so these cards are the
// growth loop: a branded stance/spectrum image anyone can screenshot-share.
type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode; // the card to capture
  hint?: string;
};

export default function ShareCardModal({ visible, onClose, children, hint }: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const cardRef = useRef<View>(null);

  const share = async () => {
    try {
      tapMedium();
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device can’t share right now.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share' });
    } catch (err: any) {
      Alert.alert('Could not create image', err?.message ?? 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.handle} />

          {/* The capture target */}
          <View ref={cardRef} collapsable={false} style={styles.cardMount}>
            {children}
          </View>

          {hint ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}

          <Pressable style={styles.shareBtn} onPress={share}>
            <ThemedText style={styles.shareText}>Share</ThemedText>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <ThemedText style={styles.cancelText}>Close</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 620 : undefined,
    backgroundColor: c.overlayCard,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.faint,
    marginBottom: 20,
  },
  cardMount: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  hint: {
    color: c.muted,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: 20,
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  shareText: {
    color: c.onPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  cancelText: {
    color: c.muted,
    fontWeight: '700',
    fontSize: 15,
  },
});
