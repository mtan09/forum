import { Session, User } from '@supabase/supabase-js'
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) console.log('Error getting session:', error.message)
        if (!isMounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (err) {
        if (isMounted) console.log('Unexpected error getting session:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.log('Error signing out:', error.message)
  }

  const value = useMemo(() => ({
    session,
    user,
    loading,
    isAuthenticated: !!session?.user?.id,
    signOut,
  }), [session, user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
