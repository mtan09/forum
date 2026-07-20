import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRef } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
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
  const cardRef = useRef<View>(null);

  const share = async () => {
    try {
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 20,
  },
  cardMount: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  hint: {
    color: '#8D8D8D',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: 20,
    backgroundColor: '#B647FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  shareText: {
    color: '#FFFFFF',
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
    color: '#8D8D8D',
    fontWeight: '700',
    fontSize: 15,
  },
});
