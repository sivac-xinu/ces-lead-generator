import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types'

const E2E_AUTH_BYPASS_ENV = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true'

const E2E_USER: UserProfile = {
  id: 'e2e-user',
  email: 'e2e@example.com',
  role: 'admin',
  approved: true,
}

export interface AuthContextValue {
  user: UserProfile | null
  session: boolean
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string) => Promise<{ error?: Error }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: Error }>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getBypassUser(): UserProfile | null {
  // The E2E bypass requires both the build-time env flag and a runtime localStorage
  // flag so it cannot be accidentally triggered in production by end users.
  if (!E2E_AUTH_BYPASS_ENV) return null
  if (typeof localStorage !== 'undefined' && localStorage.getItem('ces:e2e:bypass') === 'true') {
    return E2E_USER
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserProfile | null>(getBypassUser)
  const [loading, setLoading] = useState(() => user === null)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setUser(data as UserProfile)
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    if (user) {
      // Authenticated via E2E bypass; skip Supabase session initialization.
      return
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ?? undefined }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ?? undefined }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/', { replace: true })
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error: error ?? undefined }
  }

  const value: AuthContextValue = {
    user,
    session: !!user,
    loading,
    isAdmin: user?.role === 'admin',
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function hasRole(user: UserProfile | null, role: UserRole) {
  return user?.role === role
}
