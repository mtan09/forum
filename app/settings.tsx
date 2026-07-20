import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/authContext';
import { api } from '@/lib/api';
import { disableFloorReminder, enableFloorReminder } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

// Local preference toggles — persisted on-device; no server wiring yet
type Prefs = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  replyNotifications: boolean;
  upvoteNotifications: boolean;
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
  floorReminder: false,
  privateAccount: false,
  showLeanOnProfile: true,
  autoplayMedia: true,
  dataSaver: false,
};

const PREFS_KEY = 'forum.settings';

function SectionHeader({ title }: { title: string }) {
  return <ThemedText style={styles.sectionHeader}>{title}</ThemedText>;
}

function Row({ label, value, onPress, danger, chevron }: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.6 } : null]}>
      <ThemedText style={[styles.rowLabel, danger && styles.dangerText]}>{label}</ThemedText>
      <ThemedView style={styles.rowRight}>
        {value !== undefined && <ThemedText style={styles.rowValue} numberOfLines={1}>{value}</ThemedText>}
        {chevron && <IconSymbol name="chevron.right" size={16} color="#C6C6C6" />}
      </ThemedView>
    </Pressable>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: '#B647FF' }}
      />
    </ThemedView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <ThemedView style={styles.card}>{children}</ThemedView>;
}

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => { if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); })
      .catch(() => {});
  }, []);

  const setPref = (key: keyof Prefs) => (value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const comingSoon = (feature: string) => () => Alert.alert(feature, 'Coming soon.');

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionHeader title="Account" />
      <Card>
        <Row label="Edit Profile" chevron onPress={() => router.push('/editprofile')} />
        <Row label="Change Password" chevron onPress={() => router.push('/changepassword')} />
        <Row label="Email" value={user?.email ?? '—'} />
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <ToggleRow label="Push notifications" value={prefs.pushNotifications} onChange={setPref('pushNotifications')} />
        <ToggleRow label="Email notifications" value={prefs.emailNotifications} onChange={setPref('emailNotifications')} />
        <ToggleRow label="Replies to my posts" value={prefs.replyNotifications} onChange={setPref('replyNotifications')} />
        <ToggleRow label="Upvotes on my posts" value={prefs.upvoteNotifications} onChange={setPref('upvoteNotifications')} />
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

      <SectionHeader title="About" />
      <Card>
        <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <Row label="Terms of Service" chevron onPress={comingSoon('Terms of Service')} />
        <Row label="Privacy Policy" chevron onPress={comingSoon('Privacy Policy')} />
      </Card>

      <Card>
        <Row label="Log Out" danger onPress={handleLogout} />
        <Row label="Delete Account" danger onPress={handleDeleteAccount} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    color: '#8D8D8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DCFF',
    backgroundColor: '#F5F2FF',
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4DCFF',
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
    color: '#8D8D8D',
    fontSize: 14,
    flexShrink: 1,
  },
  dangerText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
});
