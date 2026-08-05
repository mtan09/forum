import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { AI_CONSENT_VERSION, setAIConsentRequestHandler } from '@/lib/ai-consent';
import { api, API_URL } from '@/lib/api';
import * as WebBrowser from 'expo-web-browser';
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from './authContext';

type AIConsentContextValue = {
  current: boolean;
  requestConsent: () => Promise<boolean>;
  revokeConsent: () => Promise<void>;
};

const AIConsentContext = createContext<AIConsentContextValue>({
  current: false,
  requestConsent: async () => false,
  revokeConsent: async () => {},
});

type ConsentResponse = {
  status: 'accepted' | 'declined' | 'revoked' | 'not_asked';
  current: boolean;
  consent_version: string;
};

export function AIConsentProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [current, setCurrent] = useState(!!user?.ai_consent_current);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Promise<boolean> | null>(null);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);

  useEffect(() => {
    setCurrent(!!user?.ai_consent_current);
  }, [user?.id, user?.ai_consent_current]);

  const requestConsent = useCallback((): Promise<boolean> => {
    if (!user) return Promise.resolve(false);
    if (current) return Promise.resolve(true);
    if (pendingRef.current) return pendingRef.current;

    setError(null);
    setVisible(true);
    const pending = new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
    pendingRef.current = pending;
    return pending;
  }, [current, user]);

  const finish = useCallback((accepted: boolean) => {
    setVisible(false);
    resolveRef.current?.(accepted);
    resolveRef.current = null;
    pendingRef.current = null;
  }, []);

  const decide = useCallback(async (accepted: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api<ConsentResponse>('/users/me/ai-consent', {
        method: 'PUT',
        body: {
          accepted,
          consent_version: AI_CONSENT_VERSION,
        },
      });
      setCurrent(result.current);
      await refreshUser();
      finish(result.current);
    } catch (err: any) {
      setError(err?.message ?? 'Could not save your choice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [finish, refreshUser]);

  const revokeConsent = useCallback(async () => {
    const result = await api<ConsentResponse>('/users/me/ai-consent', {
      method: 'PUT',
      body: {
        accepted: false,
        consent_version: AI_CONSENT_VERSION,
      },
    });
    setCurrent(result.current);
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    setAIConsentRequestHandler(requestConsent);
    return () => setAIConsentRequestHandler(null);
  }, [requestConsent]);

  return (
    <AIConsentContext.Provider value={{ current, requestConsent, revokeConsent }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          if (!submitting) void decide(false);
        }}
      >
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>YOUR DATA, YOUR CHOICE</Text>
            <Text style={styles.title}>Allow OpenAI processing?</Text>
            <Text style={styles.body}>
              If you allow it, forum sends text and uploaded images to OpenAI for
              an additional safety check. Your forumAI questions, relevant
              conversation, eligible publisher headlines, and forum-generated
              story context are also sent to OpenAI to generate answers. Publisher
              article bodies are not stored or sent to OpenAI.
            </Text>
            <Text style={styles.body}>
              Without permission, text posts, comments, messages, and profile
              edits still work using forum&apos;s own safety rules. Image uploads and
              forumAI require OpenAI. forum does not use your data for advertising,
              and you can withdraw permission in Settings.
            </Text>
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/legal/privacy`)}
              disabled={submitting}
            >
              <Text style={styles.link}>Read the Privacy Policy</Text>
            </Pressable>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              onPress={() => void decide(true)}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && styles.pressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Allow OpenAI processing</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => void decide(false)}
              disabled={submitting}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Not now</Text>
            </Pressable>
            <Text style={styles.footnote}>
              Not now keeps browsing and text-based social features available.
              Image uploads and forumAI will ask again when needed.
            </Text>
          </View>
        </View>
      </Modal>
    </AIConsentContext.Provider>
  );
}

export const useAIConsent = () => useContext(AIConsentContext);

const makeStyles = (c: Palette) => StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: c.scrim,
  },
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : 420,
    padding: 22,
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surfaceRaised,
  },
  eyebrow: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    color: c.text,
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: c.subtle,
    fontSize: 15,
    lineHeight: 21,
  },
  link: {
    color: c.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: c.danger,
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: c.primary,
  },
  primaryButtonText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceMuted,
  },
  secondaryButtonText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
  footnote: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
