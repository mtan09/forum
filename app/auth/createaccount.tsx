import AppTextInput from '@/components/app-text-input';
import ScalableImage from '@/components/scalable-image';
import { AUTH_CONTENT_MAX_WIDTH } from '@/constants/layout';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { API_URL } from '@/lib/api';
import { tapLight, tapMedium } from '@/lib/haptics';
import { openExternalUrl } from '@/lib/open-external';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CreateAccount() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [aiConsent, setAIConsent] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { signUp } = useAuth();

  const handleSignUp = async () => {
    setErr(null);
    if (!name.trim()) return setErr('Username is required.');
    if (!email.trim()) return setErr('Email is required.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    if (aiConsent === null) return setErr('Choose how forum may use OpenAI before continuing.');
    if (!acceptedTerms) return setErr('Agree to the Terms and Privacy Policy before continuing.');

    try {
      tapMedium();
      setLoading(true);
      await signUp(name.trim(), email.trim(), password, aiConsent);
      // Navigate directly so account creation never flashes the root
      // navigator's session-redirect placeholder between these screens.
      router.replace('/onboarding');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScalableImage 
        source={require('@/assets/images/forumlogo.png')}
        type='width' 
        dimension={112}
        style={styles.image}
      />
      <Text style={styles.eyebrow}>JOIN THE CONVERSATION</Text>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>
        One account for the feed, the story summaries, The Floor, and forumAI.
      </Text>
      {/* Same left/center/right motif as login and the landing page. */}
      <View style={styles.rule}>
        <View style={[styles.ruleSegment, { backgroundColor: c.blue }]} />
        <View style={[styles.ruleSegment, { backgroundColor: c.centerTag }]} />
        <View style={[styles.ruleSegment, { backgroundColor: c.red }]} />
      </View>

      {!!err && (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{err}</Text>
        </View>
      )}

      <AppTextInput
        placeholder="Username"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <AppTextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <AppTextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <AppTextInput
        placeholder="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        editable={!loading}
      />

      <View style={styles.consentCard}>
        <Text style={styles.consentEyebrow}>YOUR DATA, YOUR CHOICE</Text>
        <Text style={styles.consentTitle}>OpenAI processing</Text>
        <Text style={styles.consentBody}>
          If you allow it, forum sends text and uploaded images to OpenAI for an
          additional safety check. forumAI sends your questions and relevant
          context to OpenAI to generate answers.
        </Text>
        <Text style={styles.consentBody}>
          Without permission, text-based social features still work using forum&apos;s
          own safety rules. Image uploads and forumAI require OpenAI. You can
          withdraw permission in Settings.
        </Text>
        <TouchableOpacity
          disabled={loading}
          onPress={() => { tapLight(); openExternalUrl(`${API_URL}/legal/privacy`); }}
        >
          <Text style={styles.privacyLink}>Read the Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={loading}
          onPress={() => { tapLight(); setAIConsent(true); }}
          accessibilityRole="radio"
          accessibilityState={{ checked: aiConsent === true }}
          style={[styles.consentOption, aiConsent === true && styles.consentOptionSelected]}
        >
          <View style={[styles.radio, aiConsent === true && styles.radioSelected]}>
            {aiConsent === true && <View style={styles.radioDot} />}
          </View>
          <View style={styles.consentOptionCopy}>
            <Text style={styles.consentOptionTitle}>Allow OpenAI processing</Text>
            <Text style={styles.consentOptionHint}>Enable additional safety checks, image uploads, and forumAI.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={loading}
          onPress={() => { tapLight(); setAIConsent(false); }}
          accessibilityRole="radio"
          accessibilityState={{ checked: aiConsent === false }}
          style={[styles.consentOption, aiConsent === false && styles.consentOptionSelected]}
        >
          <View style={[styles.radio, aiConsent === false && styles.radioSelected]}>
            {aiConsent === false && <View style={styles.radioDot} />}
          </View>
          <View style={styles.consentOptionCopy}>
            <Text style={styles.consentOptionTitle}>Not now</Text>
            <Text style={styles.consentOptionHint}>
              Browsing and text-based social features remain available.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.termsRow}>
        <TouchableOpacity
          disabled={loading}
          onPress={() => { tapLight(); setAcceptedTerms((current) => !current); }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          accessibilityLabel="I agree to the Terms and Privacy Policy"
          style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}
        >
          {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text
            style={styles.termsLink}
            onPress={() => { tapLight(); openExternalUrl(`${API_URL}/legal/terms`); }}
          >
            Terms
          </Text>{' '}
          and{' '}
          <Text
            style={styles.termsLink}
            onPress={() => { tapLight(); openExternalUrl(`${API_URL}/legal/privacy`); }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator color={c.onPrimary} /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity
          onPress={() => { tapLight();
            router.push(`./login`);
          }}
        >
          <Text style={styles.link}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: c.background },
  container: { flexGrow: 1, width: '100%', maxWidth: Platform.OS === 'web' ? AUTH_CONTENT_MAX_WIDTH : undefined, alignSelf: 'center', padding: Platform.OS === 'web' ? 40 : 24, paddingVertical: 24, gap: 12, backgroundColor: c.background, justifyContent: 'flex-start' },
  eyebrow: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
    color: c.text,
    marginTop: 6,
  },
  subtitle: {
    color: c.subtle,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    alignSelf: 'center',
    maxWidth: 330,
  },
  rule: {
    flexDirection: 'row',
    width: 132,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 10,
    alignSelf: 'center',
  },
  ruleSegment: { flex: 1 },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.danger,
    backgroundColor: c.redBg,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  button: {
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: c.primary,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: c.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: c.onPrimary, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  error: { color: c.danger, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  consentCard: {
    marginTop: 4,
    padding: 14,
    gap: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  consentEyebrow: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  consentTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '800',
  },
  consentBody: {
    color: c.subtle,
    fontSize: 13,
    lineHeight: 18,
  },
  privacyLink: {
    color: c.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  checkmark: {
    color: c.onPrimary,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '900',
  },
  termsText: {
    flex: 1,
    color: c.subtle,
    fontSize: 13,
    lineHeight: 19,
  },
  termsLink: {
    color: c.primary,
    fontWeight: '800',
  },
  consentOption: {
    minHeight: 54,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceRaised,
  },
  consentOptionSelected: {
    borderColor: c.primary,
    backgroundColor: c.accentSoftBg,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.muted,
  },
  radioSelected: {
    borderColor: c.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  consentOptionCopy: { flex: 1, gap: 2 },
  consentOptionTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
  consentOptionHint: { color: c.muted, fontSize: 12, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  footerText: { color: c.subtle },
  link: { color: c.primary, fontWeight: '600' },
  image: {
    alignSelf: 'center',
  }
});
