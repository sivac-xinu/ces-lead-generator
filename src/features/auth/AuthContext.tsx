import { createContext } from 'react'
import type { UserRole } from '@/types'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: UserRole
  approved: boolean
  created_at?: string
}

export interface AuthContextValue {
  user: UserProfile | null
  session: boolean
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: Error }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: Error }>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
