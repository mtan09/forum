import AppTextInput from '@/components/app-text-input';
import { AUTH_CONTENT_MAX_WIDTH } from '@/constants/layout';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { API_URL } from '@/lib/api';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Two-step reset: request a 6-digit code by email, then enter it with a new
// password. Codes expire after an hour and lock after 5 attempts (server).
export default function ForgotPassword() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const post = async (path: string, body: object) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? 'Something went wrong.');
    return data;
  };

  const requestCode = async () => {
    setErr(null);
    if (!email.trim()) return setErr('Email is required.');
    try {
      tapMedium();
      setLoading(true);
      await post('/auth/forgot-password', { email: email.trim() });
      setStep('code');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setErr(null);
    if (code.trim().length !== 6) return setErr('Enter the 6-digit code from your email.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    try {
      tapMedium();
      setLoading(true);
      await post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        new_password: password,
      });
      notifySuccess();
      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.screen}>
        <View style={styles.container}>
          <Text style={styles.title}>Password reset ✓</Text>
          <Text style={styles.subtitle}>You can sign in with your new password now.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? "Enter your account's email and we'll send you a 6-digit reset code."
            : `Enter the code we sent to ${email.trim()} and choose a new password.`}
        </Text>

        {!!err && <Text style={styles.error}>{err}</Text>}

        {step === 'email' ? (
          <>
            <AppTextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <TouchableOpacity onPress={requestCode} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? <ActivityIndicator color={c.onPrimary} /> : <Text style={styles.buttonText}>Send code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <AppTextInput
              placeholder="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.codeInput}
              editable={!loading}
            />
            <AppTextInput
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            <AppTextInput
              placeholder="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              editable={!loading}
            />
            <TouchableOpacity onPress={submitReset} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? <ActivityIndicator color={c.onPrimary} /> : <Text style={styles.buttonText}>Reset password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={requestCode} disabled={loading}>
              <Text style={styles.link}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  // The canvas has to span the viewport; only the column inside it is capped,
  // or the narrower c.background column reads as a stripe over c.surface.
  screen: { flex: 1, backgroundColor: c.background },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? AUTH_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
    padding: Platform.OS === 'web' ? 40 : 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
    color: c.text,
  },
  subtitle: {
    textAlign: 'center',
    color: c.subtle,
    fontSize: 14,
    lineHeight: 21,
    alignSelf: 'center',
    maxWidth: 330,
    marginBottom: 8,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
  },
  button: {
    minHeight: 52,
    backgroundColor: c.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: c.onPrimary, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  error: { color: c.danger, textAlign: 'center' },
  link: { color: c.primary, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
