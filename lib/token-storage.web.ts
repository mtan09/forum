import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'forum.auth.token';

export const readStoredToken = () => AsyncStorage.getItem(TOKEN_KEY);

export async function writeStoredToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}
