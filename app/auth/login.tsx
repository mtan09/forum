import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { tapMedium } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setErr(null);
    if (!email.trim()) return setErr('Email is required.');
    if (!password) return setErr('Password is required.');

    try {
      tapMedium();
      setLoading(true);
      await signIn(email.trim(), password);
      // root layout redirects to the feed once the session is set
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      {!!err && <Text style={styles.error}>{err}</Text>}

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
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor={c.muted}
        editable={!loading}
      />

      <TouchableOpacity
        onPress={handleSignIn}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('./forgotpassword')}>
        <Text style={[styles.link, { textAlign: 'right' }]}>Forgot password?</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don’t have an account?</Text>
        <TouchableOpacity onPress={() => router.push('./createaccount')}>
          <Text style={styles.link}>Create account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: c.background, justifyContent: 'center' },
  title: {
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 8,
    textAlign: 'center',
    color: '#b647ff'
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    color: c.text,
  },
  button: {
    backgroundColor: '#b647ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: c.danger, marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  footerText: { color: c.subtle },
  link: { color: '#b647ff', fontWeight: '600' },
});