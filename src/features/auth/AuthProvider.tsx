import { useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from '@/lib/auth'
import { AuthContext, type AuthContextValue, type UserProfile } from './AuthContext'
import type { UserRole } from '@/types'

const E2E_AUTH_BYPASS_ENV = import.meta.env.VITE_E2E_AUTH_BYPASS === 'true'

const E2E_USER: UserProfile = {
  id: 'e2e-user',
  email: 'e2e@example.com',
  first_name: 'E2E',
  last_name: 'Tester',
  role: 'admin',
  approved: true,
}

function getBypassUser(): UserProfile | null {
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
    const profile = await getAuth().getProfile(userId)
    setUser(profile as UserProfile | null)
  }

  useEffect(() => {
    if (user) return

    const unsubscribe = getAuth().onAuthStateChange(async (authUser) => {
      if (authUser) {
        await loadProfile(authUser.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await getAuth().signIn(email, password)
    return { error: error ?? undefined }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const { error } = await getAuth().signUp(email, password, firstName, lastName)
    return { error: error ?? undefined }
  }

  const signOut = async () => {
    await getAuth().signOut()
    setUser(null)
    navigate('/', { replace: true })
  }

  const resetPassword = async (email: string) => {
    const { error } = await getAuth().resetPassword(email)
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
