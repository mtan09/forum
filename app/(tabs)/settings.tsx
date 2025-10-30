import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/authContext';
import { Pressable, StyleSheet } from 'react-native';

export default function Settings() {

  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // router.replace('/auth/landingpage');
    } catch (e) {
      console.log('Error signing out: ', e);
    }
  }
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold" style={{ fontSize: 18, fontWeight: '600' }}>
        Avatar
      </ThemedText>
      <Pressable onPress={handleLogout} style={{ marginTop: 24, alignItems: 'center' }}>
        <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', color: '#FF3B30' }}>
          Log Out
        </ThemedText>
      </Pressable>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 16,
  }
});