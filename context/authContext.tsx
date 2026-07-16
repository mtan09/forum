import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'

export type AuthUser = {
  id: string
  username: string
  email?: string
  avatar_url?: string | null
  bio?: string | null
  header_url?: string | null
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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

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
    })
    await setToken(token)
    setUser(me)
  }

  const signUp = async (username: string, email: string, password: string) => {
    const { token, user: me } = await api<{ token: string; user: AuthUser }>('/auth/signup', {
      body: { username, email, password },
    })
    await setToken(token)
    setUser(me)
  }

  const signOut = async () => {
    await setToken(null)
    setUser(null)
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
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
