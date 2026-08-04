import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { useAIConsent } from '@/context/aiConsentContext';
import { type FeedContentPreference, useFeedPreference } from '@/context/feedPreferenceContext';
import { useThemeMode, type ThemePreference } from '@/context/themeContext';
import { usePalette } from '@/hooks/use-palette';
import { api, API_URL } from '@/lib/api';
import { selectTick, tapLight } from '@/lib/haptics';
import {
  disableFloorReminder,
  enableFloorReminder,
  pushPermissionGranted,
  pushRegistrationReady,
  registerForPush,
} from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

type Prefs = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  pushReplies: boolean;
  pushUpvotes: boolean;
  pushDms: boolean;
  pushFollows: boolean;
  emailReplies: boolean;
  emailUpvotes: boolean;
  emailDms: boolean;
  emailFollows: boolean;
  floorReminder: boolean;
  privateAccount: boolean;
};

const DEFAULT_PREFS: Prefs = {
  pushNotifications: true,
  emailNotifications: false,
  pushReplies: true,
  pushUpvotes: true,
  pushDms: true,
  pushFollows: true,
  emailReplies: true,
  emailUpvotes: false,
  emailDms: true,
  emailFollows: false,
  floorReminder: false,
  privateAccount: false,
};

const PREFS_KEY = 'forum.settings';

function useStyles() {
  const { c } = usePalette();
  return { styles: useMemo(() => makeStyles(c), [c]), c };
}

function SectionHeader({ title }: { title: string }) {
  const { styles } = useStyles();
  return <ThemedText style={styles.sectionHeader}>{title}</ThemedText>;
}

function Row({ label, value, onPress, danger, chevron }: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const { styles, c } = useStyles();
  return (
    <Pressable
      onPress={onPress ? () => { tapLight(); onPress(); } : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.6 } : null]}
    >
      <ThemedText style={[styles.rowLabel, danger && styles.dangerText]}>{label}</ThemedText>
      <ThemedView style={styles.rowRight}>
        {value !== undefined && <ThemedText style={styles.rowValue} numberOfLines={1}>{value}</ThemedText>}
        {chevron && <IconSymbol name="chevron.right" size={16} color={c.faint} />}
      </ThemedView>
    </Pressable>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { styles, c } = useStyles();
  return (
    <ThemedView style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Pressable
        onPress={() => { tapLight(); onChange(!value); }}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.toggle,
          { backgroundColor: value ? c.primary : c.border },
          pressed && { opacity: 0.72 },
        ]}
      >
        <ThemedView
          style={[
            styles.toggleThumb,
            { transform: [{ translateX: value ? 18 : 0 }] },
          ]}
        />
      </Pressable>
    </ThemedView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();
  return <ThemedView style={styles.card}>{children}</ThemedView>;
}

// Light / Dark / Match system — the app follows the device until the user
// picks an explicit theme here.
const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

function AppearanceRow() {
  const { styles } = useStyles();
  const { preference, setPreference } = useThemeMode();
  return (
    <ThemedView style={[styles.row, { borderBottomWidth: 0 }]}>
      <ThemedView style={styles.segmentGroup}>
        {THEME_OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { selectTick(); setPreference(opt.value); }}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && !selected ? { opacity: 0.6 } : null,
              ]}
            >
              <ThemedText style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const FEED_CONTENT_OPTIONS: { value: FeedContentPreference; label: string }[] = [
  { value: 'all', label: 'Both' },
  { value: 'posts', label: 'Posts' },
  { value: 'articles', label: 'Articles' },
];

function FeedContentRow() {
  const { styles } = useStyles();
  const { preference, setPreference } = useFeedPreference();

  return (
    <ThemedView style={styles.preferenceBlock}>
      <ThemedText style={styles.rowLabel}>Home feed content</ThemedText>
      <ThemedText style={styles.preferenceHint}>Choose which kinds of stories appear in your main feed.</ThemedText>
      <ThemedView style={styles.segmentGroup}>
        {FEED_CONTENT_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => { selectTick(); setPreference(option.value); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.label} feed content`}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && !selected ? { opacity: 0.6 } : null,
              ]}
            >
              <ThemedText style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const { current: aiConsentCurrent, requestConsent, revokeConsent } = useAIConsent();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [devicePushReady, setDevicePushReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => { if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); })
      .catch(() => {});
    // Permission and registration are separate. The local token is written
    // only after the API confirms this device is registered.
    pushRegistrationReady().then(setDevicePushReady).catch(() => {});
    api<{
      push_enabled: boolean;
      email_enabled: boolean;
      push_replies: boolean;
      push_upvotes: boolean;
      push_dms: boolean;
      push_follows: boolean;
      email_replies: boolean;
      email_upvotes: boolean;
      email_dms: boolean;
      email_follows: boolean;
    }>('/users/me/notification-prefs')
      .then((server) => {
        setPrefs((prev) => ({
          ...prev,
          pushNotifications: server.push_enabled,
          emailNotifications: server.email_enabled,
          pushReplies: server.push_replies,
          pushUpvotes: server.push_upvotes,
          pushDms: server.push_dms,
          pushFollows: server.push_follows,
          emailReplies: server.email_replies,
          emailUpvotes: server.email_upvotes,
          emailDms: server.email_dms,
          emailFollows: server.email_follows,
          privateAccount: !!user?.is_private,
        }));
        // Repair a stale/missing server registration only when iOS permission
        // already exists. This never opens the system permission prompt.
        if (server.push_enabled) {
          pushPermissionGranted()
            .then((granted) =>
              granted
                ? registerForPush({ requestPermission: false })
                : false
            )
            .then(setDevicePushReady)
            .catch(() => setDevicePushReady(false));
        }
      })
      .catch(() => {});
  }, [user?.is_private]);

  // Which server pref (if any) each local toggle drives
  const SERVER_KEYS: Partial<Record<keyof Prefs, string>> = {
    pushNotifications: 'push_enabled',
    emailNotifications: 'email_enabled',
    pushReplies: 'push_replies',
    pushUpvotes: 'push_upvotes',
    pushDms: 'push_dms',
    pushFollows: 'push_follows',
    emailReplies: 'email_replies',
    emailUpvotes: 'email_upvotes',
    emailDms: 'email_dms',
    emailFollows: 'email_follows',
  };

  const setPref = (key: keyof Prefs) => async (value: boolean) => {
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    try {
      if (key === 'privateAccount') {
        await api('/users/me', { method: 'PATCH', body: { is_private: value } });
        await refreshUser();
      } else {
        const serverKey = SERVER_KEYS[key];
        if (serverKey) {
          await api('/users/me/notification-prefs', {
            method: 'PUT',
            body: { [serverKey]: value },
          });
        }
      }
      setPrefs((current) => {
        const next = { ...current, [key]: value };
        AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch (e: any) {
      setPrefs((current) => ({ ...current, [key]: previous }));
      Alert.alert(
        e?.code === 'EMAIL_NOT_VERIFIED' ? 'Verify your email first' : 'Could not save setting',
        e?.message ?? 'Please try again.'
      );
    }
  };

  const explainAndEnablePush = () => {
    Alert.alert(
      'Enable push notifications?',
      'forum can notify you about replies, upvotes, direct messages, and follow activity. You can choose each type below.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            const registered = await registerForPush();
            setDevicePushReady(registered);
            if (!registered) {
              Alert.alert(
                'Push is still off',
                'Notification permission was not granted. You can enable it later in iPhone Settings.'
              );
            }
          },
        },
      ]
    );
  };

  // The Floor reminder schedules a real repeating local notification; if
  // the OS denies permission we roll the toggle back.
  const toggleFloorReminder = async (value: boolean) => {
    await setPref('floorReminder')(value);
    if (value) {
      const ok = await enableFloorReminder();
      if (!ok) {
        await setPref('floorReminder')(false);
        Alert.alert('Notifications are off', 'Enable notifications for this app in Settings to get daily debate reminders.');
      }
    } else {
      await disableFloorReminder();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.log('Error signing out: ', e);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This immediately deletes your account and app activity. Associated images and private feedback screenshots are removed from active storage within 24 hours. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api('/users/me', { method: 'DELETE' });
              await signOut();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const manageAIConsent = () => {
    if (!aiConsentCurrent) {
      void requestConsent();
      return;
    }
    Alert.alert(
      'Withdraw OpenAI permission?',
      'forum will stop sending new content to OpenAI. Text posts, comments, messages, and profile edits will continue using forum\'s own safety rules. Image uploads and forumAI will ask for permission again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeConsent();
            } catch (e: any) {
              Alert.alert('Could not update permission', e?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const resetFeedPersonalization = () => {
    Alert.alert(
      'Reset feed personalization?',
      'This clears your selected interests, viewing signals, and every “Not interested” choice. Your posts, votes, follows, and saved items are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await api('/feed/personalization', { method: 'DELETE' });
              await AsyncStorage.removeItem('forum.interests').catch(() => {});
              Alert.alert('Feed reset', 'Pull to refresh Home to start with a fresh, balanced feed.');
            } catch (e: any) {
              Alert.alert('Could not reset feed', e?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const { styles } = useStyles();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Account" />
      <Card>
        <Row label="Edit Profile" chevron onPress={() => router.push('/editprofile')} />
        <Row label="Change Password" chevron onPress={() => router.push('/changepassword')} />
        <Row label="Email" value={user?.email ?? '—'} />
        {user?.email_verified === false && (
          <Row
            label="Verify email"
            value="Unverified"
            chevron
            onPress={async () => {
              try {
                await api('/auth/resend-verification', { body: {} });
                Alert.alert('Verification sent', 'Check your inbox for the verification link.');
              } catch (e: any) {
                Alert.alert('Could not send', e?.message ?? 'Please try again.');
              }
            }}
          />
        )}
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <AppearanceRow />
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <ToggleRow
          label="Push notifications"
          value={prefs.pushNotifications}
          onChange={async (value) => {
            await setPref('pushNotifications')(value);
            if (value && !devicePushReady) explainAndEnablePush();
          }}
        />
        <ToggleRow label="Email notifications" value={prefs.emailNotifications} onChange={setPref('emailNotifications')} />
        {prefs.pushNotifications && !devicePushReady && (
          <Row label="Enable push on this iPhone" chevron onPress={explainAndEnablePush} />
        )}
      </Card>

      <SectionHeader title="Push events" />
      <Card>
        <ToggleRow label="Replies" value={prefs.pushReplies} onChange={setPref('pushReplies')} />
        <ToggleRow label="Upvotes" value={prefs.pushUpvotes} onChange={setPref('pushUpvotes')} />
        <ToggleRow label="Direct messages" value={prefs.pushDms} onChange={setPref('pushDms')} />
        <ToggleRow label="Follow activity" value={prefs.pushFollows} onChange={setPref('pushFollows')} />
        <ToggleRow label="Daily debate reminder" value={prefs.floorReminder} onChange={toggleFloorReminder} />
      </Card>

      <SectionHeader title="Email events" />
      <Card>
        <ToggleRow label="Replies" value={prefs.emailReplies} onChange={setPref('emailReplies')} />
        <ToggleRow label="Upvote digest" value={prefs.emailUpvotes} onChange={setPref('emailUpvotes')} />
        <ToggleRow label="Direct messages" value={prefs.emailDms} onChange={setPref('emailDms')} />
        <ToggleRow label="Follow activity" value={prefs.emailFollows} onChange={setPref('emailFollows')} />
      </Card>

      <SectionHeader title="Privacy" />
      <Card>
        <ToggleRow label="Private account" value={prefs.privateAccount} onChange={setPref('privateAccount')} />
        {prefs.privateAccount && (
          <Row label="Follow requests" chevron onPress={() => router.push('/follow-requests')} />
        )}
        <Row label="Blocked accounts" chevron onPress={() => router.push('/blocked')} />
        <Row
          label="OpenAI processing"
          value={aiConsentCurrent ? 'Allowed' : 'Not allowed'}
          chevron
          onPress={manageAIConsent}
        />
      </Card>

      <SectionHeader title="Content" />
      <Card>
        <FeedContentRow />
        <Row label="Reset feed personalization" onPress={resetFeedPersonalization} />
      </Card>

      {user?.is_admin && (
        <>
          <SectionHeader title="Moderation" />
          <Card>
            <Row label="Review reports" chevron onPress={() => router.push('/admin')} />
            <Row label="Beta feedback" chevron onPress={() => router.push('/admin-feedback')} />
            <Row label="Moderation audit" chevron onPress={() => router.push('/admin-moderation')} />
            <Row label="Ingest status" chevron onPress={() => router.push('/admin-ingest')} />
          </Card>
        </>
      )}

      <SectionHeader title="About" />
      <Card>
        <Row
          label="Version"
          value={`${Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0'} (${Constants.nativeBuildVersion ?? 'dev'})`}
        />
        <Row label="Send Beta Feedback" chevron onPress={() => router.push('/feedback')} />
        <Row label="Support" chevron onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/support`)} />
        <Row label="Terms of Service" chevron onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/legal/terms`)} />
        <Row label="Privacy Policy" chevron onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/legal/privacy`)} />
      </Card>

      <Card>
        <Row label="Log Out" danger onPress={handleLogout} />
        <Row label="Delete Account" danger onPress={handleDeleteAccount} />
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  scroll: {
    backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
  },
  container: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 760 : undefined,
    alignSelf: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: 48,
    gap: 8,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 2,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '800',
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.cardBorder,
    backgroundColor: 'transparent',
    gap: 12,
  },
  rowLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    flexShrink: 1,
  },
  rowValue: {
    color: c.muted,
    fontSize: 14,
    flexShrink: 1,
  },
  dangerText: {
    color: c.danger,
    fontWeight: '700',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.onPrimary,
    ...(Platform.OS === 'web' ? { boxShadow: `0 1px 3px ${c.shadow}33` } : {}),
  },
  segmentGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'transparent',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: c.accentFaint,
    borderColor: c.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.subtle,
  },
  segmentTextSelected: {
    color: c.onAccentFaint,
    fontWeight: '800',
  },
  preferenceBlock: {
    paddingVertical: 13,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.cardBorder,
    backgroundColor: 'transparent',
  },
  preferenceHint: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
