import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function Landing() {

  const router = useRouter();

  return(
    <ThemedView style={ styles.container }>
      <ThemedView style={styles.imageContainer}>
        <Image source={require('@/assets/images/forumlogoInverse.png')} style={{ width: 280, height: 280}} />
        <ThemedText style={styles.title}>forum</ThemedText>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Pressable
          onPress={() => {
            router.push(`./createaccount`);
          }}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: pressed ? '#d7d7d7ff' : 'white' }
          ]}
        >
          <ThemedText style={{
            fontWeight: '800',
            color: '#b647ff',
            fontSize: 18,
          }}>
            Get started
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() =>{
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
                { color: pressed ? '#d7d7d7ff' : 'white' }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#b647ff'
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
    color: 'white',
    lineHeight: 48,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    width: screenWidth - 32,
    backgroundColor: '#b647ff',
    gap: 8,
  },
  createButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  login: {
    fontWeight: '800',
    color: 'white',
    fontSize: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  }
});
