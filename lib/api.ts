import Constants from 'expo-constants';
import { requestAIConsent } from './ai-consent';
import { readStoredToken, writeStoredToken } from './token-storage';

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

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await readStoredToken();
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  await writeStoredToken(token);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;
  constructor(status: number, message: string, code?: string, retryable?: boolean) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Retry once when the browser/device cannot establish a network request. */
  retryNetwork?: boolean;
  /** Internal loop guard for the one-time consent-and-retry flow. */
  consentRetried?: boolean;
};

const NETWORK_ERROR_MESSAGE = 'Couldn’t reach Forum. Check your connection and try again.';
const NETWORK_RETRY_DELAY_MS = 700;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = await getToken();
  const hasBody = options.body !== undefined;
  const method = options.method ?? (hasBody ? 'POST' : 'GET');
  const makeRequest = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

  let res: Response;
  try {
    res = await makeRequest();
  } catch {
    // Reads are safe to repeat. Login opts in separately because issuing a
    // second token has no server-side side effect, unlike signup/posting.
    const shouldRetry = options.retryNetwork ?? method === 'GET';
    if (!shouldRetry) throw new Error(NETWORK_ERROR_MESSAGE);
    await delay(NETWORK_RETRY_DELAY_MS);
    try {
      res = await makeRequest();
    } catch {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (
      data?.code === 'AI_CONSENT_REQUIRED' &&
      !options.consentRetried &&
      (await requestAIConsent())
    ) {
      return api<T>(path, { ...options, consentRetried: true });
    }
    throw new ApiError(
      res.status,
      data?.error ?? `Request failed (${res.status})`,
      data?.code,
      data?.retryable
    );
  }
  return data as T;
}

// Uploads a local image (picker URI) as raw bytes; returns its public URL.
export async function uploadImage(uri: string, consentRetried = false): Promise<string> {
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
  if (!res.ok) {
    if (
      data?.code === 'AI_CONSENT_REQUIRED' &&
      !consentRetried &&
      (await requestAIConsent())
    ) {
      return uploadImage(uri, true);
    }
    throw new ApiError(
      res.status,
      data?.error ?? 'Upload failed',
      data?.code,
      data?.retryable
    );
  }
  return data.url as string;
}

export async function uploadFeedbackScreenshot(
  uri: string,
  consentRetried = false
): Promise<string> {
  const fileRes = await fetch(uri);
  const buffer = await fileRes.arrayBuffer();
  const token = await getToken();
  const res = await fetch(`${API_URL}/feedback/screenshot`, {
    method: 'POST',
    headers: {
      'content-type': 'image/jpeg',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: buffer,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (
      data?.code === 'AI_CONSENT_REQUIRED' &&
      !consentRetried &&
      (await requestAIConsent())
    ) {
      return uploadFeedbackScreenshot(uri, true);
    }
    throw new ApiError(
      res.status,
      data?.error ?? 'Screenshot upload failed',
      data?.code,
      data?.retryable
    );
  }
  return data.key as string;
}
