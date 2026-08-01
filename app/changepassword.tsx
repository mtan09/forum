import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';

export default function ChangePassword() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = current.length > 0 && next.length >= 6 && confirm.length > 0 && !submitting;

  const handleSubmit = async () => {
    setError(null);
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    try {
      tapMedium();
      setSubmitting(true);
      await api('/auth/change-password', {
        body: { current_password: current, new_password: next },
      });
      notifySuccess();
      Alert.alert('Password changed', 'Your password has been updated.');
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ThemedView style={styles.screen}>
        <ThemedView style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>Change Password</ThemedText>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={8}>
            <ThemedText style={[styles.saveText, !canSubmit && { opacity: 0.5 }]}>
              {submitting ? 'Saving…' : 'Save'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.form}>
          <ThemedText style={styles.label}>Current password</ThemedText>
          <AppTextInput
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoCapitalize="none"
          />

          <ThemedText style={styles.label}>New password</ThemedText>
          <AppTextInput
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoCapitalize="none"
          />
          <ThemedText style={styles.hint}>At least 6 characters.</ThemedText>

          <ThemedText style={styles.label}>Confirm new password</ThemedText>
          <AppTextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />

          {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontWeight: '800',
    fontSize: 17,
  },
  cancelText: {
    color: c.muted,
    fontWeight: '600',
  },
  saveText: {
    color: c.primary,
    fontWeight: '800',
  },
  form: {
    padding: 16,
    gap: 6,
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
    color: c.subtle,
    marginTop: 10,
  },
  hint: {
    color: c.muted,
    fontSize: 12,
  },
  errorText: {
    color: c.danger,
    fontWeight: '600',
    marginTop: 8,
  },
});
