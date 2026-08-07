import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import { tapLight } from '@/lib/haptics';

const screenWidth = Dimensions.get('window').width;

export default function Landing() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  return(
    <ThemedView style={ styles.container }>
      <ThemedView style={styles.imageContainer}>
        <Image source={require('@/assets/images/forumlogoInverse.png')} style={{ width: 280, height: 280}} />
        <ThemedText style={styles.title}>forum</ThemedText>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Pressable
          onPress={() => { tapLight();
            router.push(`./createaccount`);
          }}
          style={({ pressed }) => [
            styles.createButton,
            { opacity: pressed ? 0.82 : 1 }
          ]}
        >
          <ThemedText style={styles.createButtonText}>
            Get started
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() =>{ tapLight();
            router.push(`./login`);
          }}
          style={{
            alignItems: 'center',
          }}
        >
          {({ pressed }) => (
            <ThemedText 
              style={[
                styles.login,
                { opacity: pressed ? 0.72 : 1 }
              ]}
            >
              Log in
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: c.primary,
  },
  imageContainer: {
    position: 'relative',
    marginTop: -64,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    position: 'absolute',
    top: 240,
    alignSelf: 'center',
    color: c.onPrimary,
    lineHeight: 48,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    width: screenWidth - 32,
    backgroundColor: c.primary,
    gap: 8,
  },
  createButton: {
    backgroundColor: c.onPrimary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: c.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  createButtonText: {
    color: c.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  login: {
    fontWeight: '800',
    color: c.onPrimary,
    fontSize: 18,
    shadowColor: c.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  }
});
