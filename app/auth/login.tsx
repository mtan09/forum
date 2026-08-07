import AppTextInput from '@/components/app-text-input';
import ScalableImage from '@/components/scalable-image';
import { AUTH_CONTENT_MAX_WIDTH } from '@/constants/layout';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { tapLight, tapMedium } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ScalableImage
            source={require('@/assets/images/forumlogo.png')}
            type="width"
            dimension={112}
            style={styles.image}
          />
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Pick up where you left off — your feed, your saved stories, and where you stand.
          </Text>
          {/* The same left/center/right motif the landing page and spectrum use. */}
          <View style={styles.rule}>
            <View style={[styles.ruleSegment, { backgroundColor: c.blue }]} />
            <View style={[styles.ruleSegment, { backgroundColor: c.centerTag }]} />
            <View style={[styles.ruleSegment, { backgroundColor: c.red }]} />
          </View>
        </View>

        <View style={styles.form}>
          {!!err && (
            <View style={styles.errorBanner}>
              <Text style={styles.error}>{err}</Text>
            </View>
          )}

          <AppTextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            editable={!loading}
          />
          <AppTextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            editable={!loading}
          />

          <TouchableOpacity
            onPress={() => { tapLight(); router.push('./forgotpassword'); }}
            disabled={loading}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
            activeOpacity={0.82}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            {loading
              ? <ActivityIndicator color={c.onPrimary} />
              : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>NEW TO FORUM</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          onPress={() => { tapLight(); router.push('./createaccount'); }}
          disabled={loading}
          accessibilityRole="button"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>One account works across web, iOS, and Android.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1, backgroundColor: c.background },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? AUTH_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 40 : 24,
    paddingVertical: 32,
    justifyContent: 'center',
    backgroundColor: c.background,
  },

  header: { alignItems: 'center', marginBottom: 24 },
  image: { marginBottom: 14 },
  eyebrow: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: c.text,
    marginTop: 6,
  },
  subtitle: {
    color: c.subtle,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
  },
  rule: {
    flexDirection: 'row',
    width: 132,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
  },
  ruleSegment: { flex: 1 },

  // No card wrapper: the input shells are already c.card, so nesting them in a
  // c.card panel made the fields vanish into it. They read as raised controls
  // against c.background, which is also how createaccount presents them.
  form: { gap: 12 },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.danger,
    backgroundColor: c.redBg,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  error: { color: c.danger, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  forgotRow: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { color: c.primary, fontSize: 13, lineHeight: 18, fontWeight: '800' },

  button: {
    minHeight: 52,
    backgroundColor: c.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: c.onPrimary, fontSize: 15, lineHeight: 19, fontWeight: '900' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
    marginBottom: 14,
  },
  divider: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: {
    color: c.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: c.primary, fontSize: 15, lineHeight: 19, fontWeight: '900' },

  footnote: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
});
