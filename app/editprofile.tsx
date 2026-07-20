import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/authContext';
import { api, uploadImage } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  // Local picks preview immediately; upload happens on save
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
  const [pickedHeader, setPickedHeader] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (setter: (uri: string) => void) => {
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
      setSaving(true);
      const body: Record<string, string | null> = {};
      if (trimmed !== user?.username) body.username = trimmed;
      if (bio !== (user?.bio ?? '')) body.bio = bio.trim() || null;
      if (pickedAvatar) body.avatar_url = await uploadImage(pickedAvatar);
      if (pickedHeader) body.header_url = await uploadImage(pickedHeader);

      if (Object.keys(body).length > 0) {
        await api('/users/me', { method: 'PATCH', body });
        await refreshUser();
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
    : user?.header_url
      ? { uri: user.header_url }
      : require('@/assets/images/solid-color-image.png');
  const avatarSource = pickedAvatar
    ? { uri: pickedAvatar }
    : user?.avatar_url
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
          <Pressable onPress={() => pick(setPickedHeader)}>
            <ImageBackground source={headerSource} style={styles.header}>
              <ThemedView style={styles.imageHint}>
                <IconSymbol name="camera.fill" size={16} color="#FFFFFF" />
              </ThemedView>
            </ImageBackground>
          </Pressable>

          {/* Avatar — tap to change */}
          <Pressable onPress={() => pick(setPickedAvatar)} style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatar} />
            <ThemedView style={[styles.imageHint, styles.avatarHint]}>
              <IconSymbol name="camera.fill" size={14} color="#FFFFFF" />
            </ThemedView>
          </Pressable>

          <ThemedView style={styles.form}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
            />

            <ThemedText style={styles.label}>Bio</ThemedText>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.bioInput]}
              multiline
              maxLength={200}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#8f8f8f"
            />
            <ThemedText style={styles.charCount}>{bio.length}/200</ThemedText>

            {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: '#8D8D8D',
    fontWeight: '600',
  },
  saveText: {
    color: '#B647FF',
    fontWeight: '800',
  },
  header: {
    width: screenWidth,
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  imageHint: {
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    borderColor: '#FFF',
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
  label: {
    fontWeight: '700',
    fontSize: 13,
    color: '#5A5A5A',
    marginTop: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E9C8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#8D8D8D',
    fontSize: 12,
  },
  errorText: {
    color: '#B3261E',
    fontWeight: '600',
    marginTop: 8,
  },
});
