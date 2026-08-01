import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, selectTick, tapLight, tapMedium } from '@/lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

// First-run welcome: pick interests (stored for personalization) and follow
// a few active accounts so the Following tab and feed aren't empty on day 1.
type SuggestedUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
};

type HotTopic = { id: string; title: string; keywords: string[] };

const INTERESTS_KEY = 'forum.interests';

// Stable starting set; live hot-topic keywords get merged in on load
const BASE_INTERESTS = [
  'economy', 'immigration', 'healthcare', 'climate', 'foreign_policy',
  'elections', 'supreme_court', 'tech_policy', 'education', 'guns',
  'abortion', 'labor',
];

export default function Onboarding() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { completeOnboarding, refreshUser, user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [interests, setInterests] = useState<string[]>(BASE_INTERESTS);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  useEffect(() => {
    api<HotTopic[]>('/topics/hot')
      .then((topics) => {
        const live = topics.flatMap((t) => t.keywords ?? []).slice(0, 8);
        setInterests((prev) => [...new Set([...live, ...prev])].slice(0, 18));
      })
      .catch(() => {});
    api<SuggestedUser[]>('/users/me/suggested')
      .then(setSuggested)
      .catch(() => {});
  }, []);

  const togglePick = (tag: string) => {
    selectTick();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const toggleFollow = async (id: string) => {
    tapLight();
    const isFollowing = followed.has(id);
    setFollowed((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await api(`/users/${id}/follow`, isFollowing ? { method: 'DELETE' } : { body: {} });
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const finish = async () => {
    tapMedium();
    await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify([...picked])).catch(() => {});
    notifySuccess();
    completeOnboarding();
    router.replace('/');
  };

  const resendVerification = async () => {
    tapLight();
    setVerificationBusy(true);
    setVerificationMessage(null);
    try {
      const result = await api<{ already_verified?: boolean }>('/auth/resend-verification', {
        body: {},
      });
      if (result.already_verified) {
        await refreshUser();
        setVerificationMessage('Your email is already verified.');
      } else {
        setVerificationMessage('A new link is on its way. Check your inbox and spam folder.');
      }
    } catch (error: any) {
      setVerificationMessage(error?.message ?? 'Could not send another link. Please try again.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const confirmVerification = async () => {
    tapMedium();
    setVerificationBusy(true);
    setVerificationMessage(null);
    try {
      const refreshed = await refreshUser();
      if (refreshed.email_verified) {
        await finish();
      } else {
        setVerificationMessage('Not verified yet. Open the link in your email, then try again.');
      }
    } catch (error: any) {
      setVerificationMessage(error?.message ?? 'Could not check your email status. Please try again.');
    } finally {
      setVerificationBusy(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.step}>Step {step} of 3</ThemedText>

        {step === 1 ? (
          <>
            <ThemedText type="title" style={styles.title}>What do you care about?</ThemedText>
            <ThemedText style={styles.subtitle}>
              Pick a few topics — they help shape what you see first.
            </ThemedText>
            <ThemedView style={styles.chips}>
              {interests.map((tag) => {
                const on = picked.has(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => togglePick(tag)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <ThemedText style={[styles.chipText, on && styles.chipTextOn]}>
                      #{tag.replace(/_/g, '')}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          </>
        ) : step === 2 ? (
          <>
            <ThemedText type="title" style={styles.title}>Follow some voices</ThemedText>
            <ThemedText style={styles.subtitle}>
              The most active people on the forum right now. Follow a few and their posts fill your Following tab.
            </ThemedText>
            {suggested.map((u) => {
              const on = followed.has(u.id);
              return (
                <ThemedView key={u.id} style={styles.userRow}>
                  <Image
                    source={u.avatar_url ? { uri: u.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
                    style={styles.avatar}
                  />
                  <ThemedView style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={styles.userName}>{u.username}</ThemedText>
                    <ThemedText style={styles.userMeta} numberOfLines={1}>
                      {u.bio || `${u.post_count} posts`}
                    </ThemedText>
                  </ThemedView>
                  <Pressable
                    onPress={() => toggleFollow(u.id)}
                    style={[styles.followBtn, on && styles.followingBtn]}
                  >
                    <ThemedText style={[styles.followText, on && styles.followingText]}>
                      {on ? 'Following' : 'Follow'}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              );
            })}
          </>
        ) : (
          <>
            <ThemedView style={styles.mailIcon}>
              <IconSymbol name="envelope.fill" size={30} color={c.primary} />
            </ThemedView>
            <ThemedText type="title" style={styles.title}>
              {user?.email_verified ? 'Email verified' : 'Verify your email'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {user?.email_verified
                ? 'Your email is ready for account recovery and the email notifications you choose.'
                : `We sent a verification link to ${user?.email ?? 'your email'}. Open it, then come back here so we can check.`}
            </ThemedText>
            {!user?.email_verified && (
              <Pressable
                disabled={verificationBusy}
                onPress={resendVerification}
                style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}
              >
                <ThemedText style={styles.resendText}>Send another link</ThemedText>
              </Pressable>
            )}
            {!!verificationMessage && (
              <ThemedText style={styles.verificationMessage}>{verificationMessage}</ThemedText>
            )}
            {!user?.email_verified && (
              <ThemedText style={styles.verificationNote}>
                You can continue without verifying. Browsing and posting still work, but email notifications
                stay off until your address is verified.
              </ThemedText>
            )}
          </>
        )}
      </ScrollView>

      <ThemedView style={styles.footer}>
        <Pressable
          disabled={verificationBusy}
          onPress={() => {
            if (step === 1) setStep(2);
            else if (step === 2) setStep(3);
            else if (user?.email_verified) void finish();
            else void confirmVerification();
          }}
          style={[styles.nextBtn, verificationBusy && styles.disabled]}
        >
          {verificationBusy ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <>
              <ThemedText style={styles.nextText}>
                {step < 3 ? 'Next' : user?.email_verified ? 'Continue to forum' : "I've verified my email"}
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={c.onPrimary} />
            </>
          )}
        </Pressable>
        {step === 3 && !user?.email_verified && (
          <Pressable disabled={verificationBusy} onPress={finish} style={styles.skipButton}>
            <ThemedText style={styles.skipText}>Continue for now</ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 24, paddingTop: 80, paddingBottom: 170, gap: 8 },
  step: { color: c.muted, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: c.primary, marginBottom: 4 },
  subtitle: { color: c.subtle, lineHeight: 21, marginBottom: 16 },
  mailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentFaint,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: c.accentFaint, borderColor: c.primary },
  chipText: { fontWeight: '600', fontSize: 15, color: c.subtle },
  chipTextOn: { color: c.onAccentFaint, fontWeight: '800' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  userName: { fontWeight: '700', fontSize: 16 },
  userMeta: { color: c.muted, fontSize: 13 },
  followBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary },
  followText: { color: c.onPrimary, fontWeight: '800', fontSize: 13 },
  followingText: { color: c.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'transparent',
    gap: 6,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingVertical: 15,
  },
  nextText: { color: c.onPrimary, fontWeight: '800', fontSize: 16 },
  resendButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  resendText: { color: c.primary, fontWeight: '800' },
  verificationMessage: { color: c.primary, lineHeight: 20, fontWeight: '600' },
  verificationNote: { color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: c.subtle, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.6 },
});
