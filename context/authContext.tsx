import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'
import { unregisterPush } from '../lib/notifications'

const ONBOARDING_KEY = 'forum.needsOnboarding'

export type AuthUser = {
  id: string
  username: string
  email?: string
  email_verified?: boolean
  is_admin?: boolean
  is_private?: boolean
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
  signUp: (username: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
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
  refreshUser: async () => {},
  needsOnboarding: false,
  completeOnboarding: () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setNeedsOnboarding(v === '1'))
      .catch(() => {})
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

  const signUp = async (username: string, email: string, password: string) => {
    const { token, user: me } = await api<{ token: string; user: AuthUser }>('/auth/signup', {
      body: { username, email, password },
    })
    await setToken(token)
    // Brand-new account → run the welcome flow (persisted so an app
    // restart mid-onboarding comes back to it)
    setNeedsOnboarding(true)
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {})
    setUser(me)
  }

  const completeOnboarding = () => {
    setNeedsOnboarding(false)
    AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {})
  }

  const signOut = async () => {
    await unregisterPush().catch(() => {})
    await setToken(null)
    setUser(null)
  }

  // Re-fetch the profile after edits so every screen sees the update
  const refreshUser = async () => {
    const me = await api<AuthUser>('/users/me')
    setUser(me)
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
