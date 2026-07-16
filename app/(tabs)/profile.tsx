import ScalableImage from '@/components/scalable-image';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export const spectrums = [
    { id: '8c4a1a64-d3b6-4eb2-b86c-d9af397cdb1e', label: '🏛️ Elections & Government', position: .86 },
    { id: 'b2341048-0108-450d-91ae-d0f509f6f574', label: '🌎 Foreign Policy & Defense', position: .35 },
    { id: 'f289ef45-488d-46cf-aad2-d045453f4875', label: '📈 Economy & Jobs', position: .12 },
    { id: '49abf187-8b6b-419d-a093-a76dc7104819', label: '🧬 Tech & Innovation', position: .60 },
    { id: 'd2cfb810-94f0-4446-982c-38ad27585bca', label: '🛂 Immigration & Border', position: .20 },
    { id: '2e6042ef-4598-42a8-8624-1eb961845cbd', label: '🌱 Health & Environment', position: .75 },
    { id: '95f37b29-a5f9-432b-a411-b5ba1e16a493', label: '⚖️ Rights & Freedoms', position: .20 },
  ]

export default function Profile() {

  // const spectrums = [
  //   { id: 'government', label: '🏛️ Elections & Government', position: .86, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
  //   { id: 'economy', label: '📈 Economy & Jobs', position: .12, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
  //   { id: 'social', label: '⚖️ Social & Cultural Values', position: .95, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
  //   { id: 'foreign', label: '🌎 Foreign Policy & Defense', position: .35, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
  //   { id: 'stem', label: '🧬 Tech & Innovation', position: .60, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
  // ]

  const [openSpectrums, setOpenSpectrums] = useState<Record<string, boolean>>({});
  
  const toggleSpectrums = (spectrumId: string) => {
    setOpenSpectrums(prev => ({
      ...prev,
      [spectrumId]: !prev[spectrumId]
    }));
  };

  const router = useRouter();

  // profile data comes from the auth session (/users/me)
  const { user: profile } = useAuth();

  return(
    <ScrollView>
      <ScalableImage 
        source={
          profile?.header_url
            ? { uri: profile.header_url }  
            : require('@/assets/images/solid-color-image.png')
        }
        type="width" 
        dimension={screenWidth} 
        height={200}
      />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.avatarContainer}>
          <Image
            source={
              profile?.avatar_url
                ? { uri: profile.avatar_url }  
                : require('@/assets/images/Default_pfp.jpg')
            }
            style={styles.avatar}
          />
        </ThemedView>
        <ThemedText type="defaultSemiBold" style={{marginTop: 48, fontWeight: '800', fontSize: 24}}>{profile?.username}</ThemedText>

        {profile?.bio && (
          <ThemedText>
            {profile?.bio || ''}
          </ThemedText>
        )}

        {spectrums.map(spectrum => (
          <ThemedView key={spectrum.id}>
            <ThemedView style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8}}>
              <ThemedText type="defaultSemiBold" style={{fontWeight: 600}}>{spectrum.label}</ThemedText>
            </ThemedView>
            <Spectrum width={(screenWidth - 32)} position={spectrum.position}/>
          </ThemedView>
        ))}

        {/* {spectrums.map(spectrum=> (
          <ThemedView key={spectrum.id}>
            <Pressable
              onPress={() => toggleSpectrums(spectrum.id)}
            >
              <ThemedView style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8}}>
                <IconSymbol name={openSpectrums[spectrum.id] ? "chevron.down" : "chevron.right"} size={20} color="#592EDC" />
                <ThemedText type="defaultSemiBold" style={{fontWeight: 600}}>{spectrum.label}</ThemedText>
              </ThemedView>
              <Spectrum width={(screenWidth - 32)} position={spectrum.position}/>
              </Pressable>
              {openSpectrums[spectrum.id] && (
                <ThemedView style={{ backgroundColor: "#BAA8F0", padding: 16, borderRadius: 16, marginTop: 8}}>
                  <ThemedText>{spectrum.description}</ThemedText>
                </ThemedView>
              )}
          </ThemedView>
        ))} */}
      </ThemedView>
    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  avatarContainer: {
    position: 'absolute',
    top: -54,
    left: 8,
    borderRadius: 54,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderColor: '#FFF',
    borderWidth: 8,
  },
});