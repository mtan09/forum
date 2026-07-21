import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { useThemeMode, type ThemePreference } from '@/context/themeContext';
import { usePalette } from '@/hooks/use-palette';
import { api, API_URL } from '@/lib/api';
import { selectTick, tapLight } from '@/lib/haptics';
import { disableFloorReminder, enableFloorReminder } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

// Local preference toggles — persisted on-device; no server wiring yet
type Prefs = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  replyNotifications: boolean;
  upvoteNotifications: boolean;
  dmNotifications: boolean;
  floorReminder: boolean;
  privateAccount: boolean;
  showLeanOnProfile: boolean;
  autoplayMedia: boolean;
  dataSaver: boolean;
};

const DEFAULT_PREFS: Prefs = {
  pushNotifications: true,
  emailNotifications: false,
  replyNotifications: true,
  upvoteNotifications: true,
  dmNotifications: true,
  floorReminder: false,
  privateAccount: false,
  showLeanOnProfile: true,
  autoplayMedia: true,
  dataSaver: false,
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
      <Switch
        value={value}
        onValueChange={(v) => { tapLight(); onChange(v); }}
        trackColor={{ true: c.primary }}
      />
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

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => { if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); })
      .catch(() => {});
    // Server is the source of truth for push delivery — sync it in
    api<{ push_enabled: boolean; replies: boolean; upvotes: boolean; dms: boolean }>('/users/me/notification-prefs')
      .then((server) => {
        setPrefs((prev) => ({
          ...prev,
          pushNotifications: server.push_enabled,
          replyNotifications: server.replies,
          upvoteNotifications: server.upvotes,
          dmNotifications: server.dms,
        }));
      })
      .catch(() => {});
  }, []);

  // Which server pref (if any) each local toggle drives
  const SERVER_KEYS: Partial<Record<keyof Prefs, string>> = {
    pushNotifications: 'push_enabled',
    replyNotifications: 'replies',
    upvoteNotifications: 'upvotes',
    dmNotifications: 'dms',
  };

  const setPref = (key: keyof Prefs) => (value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    const serverKey = SERVER_KEYS[key];
    if (serverKey) {
      api('/users/me/notification-prefs', { method: 'PUT', body: { [serverKey]: value } })
        .catch((e: any) => console.log('Error saving notification pref:', e?.message));
    }
  };

  // The Floor reminder schedules a real repeating local notification; if
  // the OS denies permission we roll the toggle back.
  const toggleFloorReminder = async (value: boolean) => {
    setPref('floorReminder')(value);
    if (value) {
      const ok = await enableFloorReminder();
      if (!ok) {
        setPref('floorReminder')(false);
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
      'This permanently deletes your profile, posts, comments, and votes. This cannot be undone.',
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

  const { styles } = useStyles();

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        <ToggleRow label="Push notifications" value={prefs.pushNotifications} onChange={setPref('pushNotifications')} />
        <ToggleRow label="Email notifications" value={prefs.emailNotifications} onChange={setPref('emailNotifications')} />
        <ToggleRow label="Replies to my posts" value={prefs.replyNotifications} onChange={setPref('replyNotifications')} />
        <ToggleRow label="Upvotes on my posts" value={prefs.upvoteNotifications} onChange={setPref('upvoteNotifications')} />
        <ToggleRow label="Direct messages" value={prefs.dmNotifications} onChange={setPref('dmNotifications')} />
        <ToggleRow label="Daily debate reminder" value={prefs.floorReminder} onChange={toggleFloorReminder} />
      </Card>

      <SectionHeader title="Privacy" />
      <Card>
        <ToggleRow label="Private account" value={prefs.privateAccount} onChange={setPref('privateAccount')} />
        <ToggleRow label="Show my lean on profile" value={prefs.showLeanOnProfile} onChange={setPref('showLeanOnProfile')} />
        <Row label="Blocked accounts" chevron onPress={() => router.push('/blocked')} />
      </Card>

      <SectionHeader title="Content" />
      <Card>
        <ToggleRow label="Autoplay media" value={prefs.autoplayMedia} onChange={setPref('autoplayMedia')} />
        <ToggleRow label="Data saver" value={prefs.dataSaver} onChange={setPref('dataSaver')} />
      </Card>

      {user?.is_admin && (
        <>
          <SectionHeader title="Moderation" />
          <Card>
            <Row label="Review reports" chevron onPress={() => router.push('/admin')} />
          </Card>
        </>
      )}

      <SectionHeader title="About" />
      <Card>
        <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
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
  container: {
    padding: 16,
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
});
