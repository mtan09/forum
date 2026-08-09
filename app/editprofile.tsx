import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api, uploadImage } from '@/lib/api';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function EditProfile() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  // Local picks preview immediately; upload happens on save
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
  const [pickedHeader, setPickedHeader] = useState<string | null>(null);
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(false);
  const [useDefaultHeader, setUseDefaultHeader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (setter: (uri: string) => void) => {
    tapLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 24) {
      setError('Username must be 3–24 characters.');
      return;
    }
    try {
      tapMedium();
      setSaving(true);
      const body: Record<string, string | null> = {};
      if (trimmed !== user?.username) body.username = trimmed;
      if (bio !== (user?.bio ?? '')) body.bio = bio.trim() || null;
      if (pickedAvatar) body.avatar_url = await uploadImage(pickedAvatar);
      else if (useDefaultAvatar && user?.avatar_url) body.avatar_url = null;
      if (pickedHeader) body.header_url = await uploadImage(pickedHeader);
      else if (useDefaultHeader && user?.header_url) body.header_url = null;

      if (Object.keys(body).length > 0) {
        await api('/users/me', { method: 'PATCH', body });
        await refreshUser();
        notifySuccess();
      }
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const headerSource = pickedHeader
    ? { uri: pickedHeader }
    : user?.header_url && !useDefaultHeader
      ? { uri: user.header_url }
      : require('@/assets/images/solid-color-image.png');
  const avatarSource = pickedAvatar
    ? { uri: pickedAvatar }
    : user?.avatar_url && !useDefaultAvatar
      ? { uri: user.avatar_url }
      : require('@/assets/images/Default_pfp.jpg');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ThemedView style={styles.screen}>
        {/* Top bar */}
        <ThemedView style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>Edit Profile</ThemedText>
          <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
            <ThemedText style={[styles.saveText, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving…' : 'Save'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ScrollView keyboardShouldPersistTaps="handled">
          {/* Header image — tap to change */}
          <Pressable onPress={() => pick((uri) => {
            setPickedHeader(uri);
            setUseDefaultHeader(false);
          })}>
            <ImageBackground source={headerSource} style={styles.header}>
              <ThemedView style={styles.imageHint}>
                <IconSymbol name="camera.fill" size={16} color={c.onImage} />
              </ThemedView>
            </ImageBackground>
          </Pressable>

          {/* Avatar — tap to change */}
          <Pressable onPress={() => pick((uri) => {
            setPickedAvatar(uri);
            setUseDefaultAvatar(false);
          })} style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatar} />
            <ThemedView style={[styles.imageHint, styles.avatarHint]}>
              <IconSymbol name="camera.fill" size={14} color={c.onImage} />
            </ThemedView>
          </Pressable>

          <ThemedView style={styles.form}>
            <View style={styles.mediaResetRow}>
              {(user?.header_url || pickedHeader) && (
                <Pressable
                  onPress={() => {
                    tapLight();
                    setPickedHeader(null);
                    setUseDefaultHeader(true);
                  }}
                  style={({ pressed }) => [styles.mediaResetButton, pressed && styles.mediaResetPressed]}
                >
                  <ThemedText style={styles.mediaResetText}>Use default background</ThemedText>
                </Pressable>
              )}
              {(user?.avatar_url || pickedAvatar) && (
                <Pressable
                  onPress={() => {
                    tapLight();
                    setPickedAvatar(null);
                    setUseDefaultAvatar(true);
                  }}
                  style={({ pressed }) => [styles.mediaResetButton, pressed && styles.mediaResetPressed]}
                >
                  <ThemedText style={styles.mediaResetText}>Use default avatar</ThemedText>
                </Pressable>
              )}
            </View>

            <ThemedText style={styles.label}>Username</ThemedText>
            <AppTextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
            />

            <ThemedText style={styles.label}>Bio</ThemedText>
            <AppTextInput
              value={bio}
              onChangeText={setBio}
              containerStyle={styles.bioInput}
              multiline
              maxLength={200}
              placeholder="Tell people about yourself..."
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>{bio.length}/200</ThemedText>

            {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontWeight: '800',
    fontSize: 17,
  },
  cancelText: {
    color: c.muted,
    fontWeight: '600',
  },
  saveText: {
    color: c.primary,
    fontWeight: '800',
  },
  header: {
    width: screenWidth,
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  imageHint: {
    backgroundColor: c.imageControlBg,
    borderRadius: 14,
    padding: 6,
    margin: 10,
  },
  avatarWrap: {
    marginTop: -44,
    marginLeft: 16,
    width: 88,
    height: 88,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderColor: c.background,
    borderWidth: 4,
  },
  avatarHint: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    margin: 0,
  },
  form: {
    padding: 16,
    gap: 6,
  },
  mediaResetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  mediaResetButton: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaResetPressed: {
    opacity: 0.65,
  },
  mediaResetText: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
    color: c.subtle,
    marginTop: 10,
  },
  bioInput: {
    minHeight: 88,
    alignItems: 'flex-start',
  },
  charCount: {
    alignSelf: 'flex-end',
    color: c.muted,
    fontSize: 12,
  },
  errorText: {
    color: c.danger,
    fontWeight: '600',
    marginTop: 8,
  },
});
