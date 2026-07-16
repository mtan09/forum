import ScalableImage from '@/components/scalable-image';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateAccount() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { signUp } = useAuth();

  const handleSignUp = async () => {
    setErr(null);
    if (!name.trim()) return setErr('Username is required.');
    if (!email.trim()) return setErr('Email is required.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');

    try {
      setLoading(true);
      await signUp(name.trim(), email.trim(), password);
      // root layout redirects to the feed once the session is set
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
    <View style={styles.container}>
      <ScalableImage 
        source={require('@/assets/images/forumlogoCropped.png')} 
        type='width' 
        dimension={200} 
        style={styles.image}
      />
      <Text style={styles.title}>Create account</Text>

      {!!err && <Text style={styles.error}>{err}</Text>}

      <TextInput
        placeholder="Username"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        placeholder="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.input}
        editable={!loading}
      />

      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity
          onPress={() => {
            router.push(`./login`);
          }}
        >
          <Text style={styles.link}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff', justifyContent: 'center' },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 8,
    textAlign: 'center',
    color: '#b647ff'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
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
  error: { color: '#b91c1c', marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  footerText: { color: '#6b7280' },
  link: { color: '#b647ff', fontWeight: '600' },
  image: {
    alignSelf: 'center',
  }
});