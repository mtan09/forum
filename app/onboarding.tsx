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
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';

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
  const { completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [interests, setInterests] = useState<string[]>(BASE_INTERESTS);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

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

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.step}>Step {step} of 2</ThemedText>

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
        ) : (
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
        )}
      </ScrollView>

      <ThemedView style={styles.footer}>
        <Pressable
          onPress={() => (step === 1 ? setStep(2) : finish())}
          style={styles.nextBtn}
        >
          <ThemedText style={styles.nextText}>
            {step === 1 ? 'Next' : followed.size > 0 ? "Let's go" : 'Skip for now'}
          </ThemedText>
          <IconSymbol name="chevron.right" size={18} color="#FFFFFF" />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 24, paddingTop: 80, paddingBottom: 120, gap: 8 },
  step: { color: c.muted, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: c.accent, marginBottom: 4 },
  subtitle: { color: c.subtle, lineHeight: 21, marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: c.accentFaint, borderColor: c.accent },
  chipText: { fontWeight: '600', fontSize: 15, color: c.subtle },
  chipTextOn: { color: c.onAccentFaint, fontWeight: '800' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  userName: { fontWeight: '700', fontSize: 16 },
  userMeta: { color: c.muted, fontSize: 13 },
  followBtn: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.accent },
  followText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  followingText: { color: c.accent },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.accent,
    borderRadius: 16,
    paddingVertical: 15,
  },
  nextText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
