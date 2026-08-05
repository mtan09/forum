import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { AI_CONSENT_VERSION } from '../lib/ai-consent'
import { api, getToken, setToken } from '../lib/api'
import { unregisterPush } from '../lib/notifications'

const LEGACY_ONBOARDING_KEY = 'forum.needsOnboarding'

export type AuthUser = {
  id: string
  username: string
  email?: string
  email_verified?: boolean
  is_admin?: boolean
  is_private?: boolean
  is_demo?: boolean
  ai_consent_status?: 'accepted' | 'declined' | 'revoked' | 'not_asked'
  ai_consent_current?: boolean
  ai_consent_version?: string | null
  avatar_url?: string | null
  bio?: string | null
  header_url?: string | null
  created_at?: string
}

type AuthContextType = {
  // session mirrors the old supabase shape ({ user } | null) so existing
  // truthiness checks in screens keep working
  session: { user: AuthUser } | null
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    username: string,
    email: string,
    password: string,
    aiConsentAccepted: boolean
  ) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<AuthUser>
  /** True right after signup until the welcome flow completes. */
  needsOnboarding: boolean
  completeOnboarding: () => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshUser: async () => {
    throw new Error('AuthProvider is not ready')
  },
  needsOnboarding: false,
  completeOnboarding: () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    // Onboarding is a one-session welcome flow. Clear the former persisted
    // flag so an account that previously stopped midway opens the feed on its
    // next cold launch instead of being forced back into onboarding.
    AsyncStorage.removeItem(LEGACY_ONBOARDING_KEY).catch(() => {})
  }, [])

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const me = await api<AuthUser>('/users/me')
        if (isMounted) setUser(me)
      } catch {
        // token expired or invalid — clear it
        await setToken(null)
        if (isMounted) setUser(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    restoreSession().then(() => {
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { token, user: me } = await api<{ token: string; user: AuthUser }>('/auth/login', {
      body: { email, password },
      // Login is safe to repeat if Safari fails before receiving a response.
      retryNetwork: true,
    })
    await setToken(token)
    setUser(me)
  }

  const signUp = async (
    username: string,
    email: string,
    password: string,
    aiConsentAccepted: boolean
  ) => {
    const { token, user: me } = await api<{ token: string; user: AuthUser }>('/auth/signup', {
      body: {
        username,
        email,
        password,
        ai_consent_accepted: aiConsentAccepted,
        ai_consent_version: AI_CONSENT_VERSION,
      },
    })
    await setToken(token)
    // Brand-new account → run the welcome flow for this app session only.
    // The account and token are already durable, so a cold relaunch opens the
    // normal signed-in experience even if onboarding was not finished.
    setNeedsOnboarding(true)
    setUser(me)
  }

  const completeOnboarding = () => {
    setNeedsOnboarding(false)
  }

  const signOut = async () => {
    await unregisterPush().catch(() => {})
    await setToken(null)
    setNeedsOnboarding(false)
    setUser(null)
  }

  // Re-fetch the profile after edits so every screen sees the update
  const refreshUser = async () => {
    const me = await api<AuthUser>('/users/me')
    setUser(me)
    return me
  }

  const value = useMemo(
    () => ({
      session: user ? { user } : null,
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      refreshUser,
      needsOnboarding,
      completeOnboarding,
    }),
    [user, loading, needsOnboarding]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
