import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Resolution order: EXPO_PUBLIC_API_URL env var, then the Expo dev server's
// host (so a phone on the same LAN reaches the API without config), then localhost.
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = 'forum.auth.token';
let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = await getToken();
  const hasBody = options.body !== undefined;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (hasBody ? 'POST' : 'GET'),
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// Uploads a local image (picker URI) as raw bytes; returns its public URL.
export async function uploadImage(uri: string): Promise<string> {
  const fileRes = await fetch(uri);
  const buffer = await fileRes.arrayBuffer();

  const uriExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const ext = uriExt && uriExt.length <= 5 ? uriExt : 'jpg';
  const contentType =
    ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : ext === 'heic' ? 'image/heic'
    : ext === 'heif' ? 'image/heif'
    : ext === 'gif' ? 'image/gif'
    : 'image/jpeg';

  const token = await getToken();
  const res = await fetch(`${API_URL}/storage/upload?filename=upload.${ext}`, {
    method: 'POST',
    headers: {
      'content-type': contentType,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: buffer,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Upload failed');
  return data.url as string;
}
