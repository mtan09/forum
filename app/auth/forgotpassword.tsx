import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { API_URL } from '@/lib/api';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      <View style={styles.container}>
        <Text style={styles.title}>Password reset ✓</Text>
        <Text style={styles.subtitle}>You can sign in with your new password now.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={c.muted}
              editable={!loading}
            />
            <TouchableOpacity onPress={requestCode} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              placeholder="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput]}
              placeholderTextColor={c.muted}
              editable={!loading}
            />
            <TextInput
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={c.muted}
              editable={!loading}
            />
            <TextInput
              placeholder="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={c.muted}
              editable={!loading}
            />
            <TouchableOpacity onPress={submitReset} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
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
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: c.background, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#b647ff',
  },
  subtitle: {
    textAlign: 'center',
    color: c.subtle,
    lineHeight: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    color: c.text,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#b647ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: c.danger, textAlign: 'center' },
  link: { color: '#b647ff', fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
