import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { CESLogo } from '@/components/ui/CESLogo'

function getInitialAuthState():
  | { mode: 'signin' | 'signup' | 'reset'; message: string; error: string }
  | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = window.location.hash + window.location.search
  const params = new URLSearchParams(raw.replace(/^#/, ''))
  const type = params.get('type')
  const callbackError = params.get('error')
  const errorDescription = params.get('error_description')

  if (callbackError) {
    return { mode: 'signin', message: '', error: errorDescription || callbackError }
  }
  if (type === 'signup') {
    return { mode: 'signin', message: 'Email confirmed! You can now sign in.', error: '' }
  }
  if (type === 'recovery') {
    return { mode: 'reset', message: 'You can now set a new password.', error: '' }
  }
  if (type === 'magiclink') {
    return { mode: 'signin', message: 'Magic link confirmed! You are being signed in.', error: '' }
  }
  return undefined
}

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const initial = getInitialAuthState()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initial?.mode ?? 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initial?.error ?? '')
  const [message, setMessage] = useState(initial?.message ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'reset') {
      const { error } = await resetPassword(email)
      if (error) return setError(error.message)
      setMessage('Password reset link sent.')
      return
    }

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      return
    }

    const { error } = await signUp(email, password)
    if (error) {
      setError(error.message)
      return
    }

    setMessage('Account created. Please check your email for a confirmation link.')
    setEmail('')
    setPassword('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#00356C] to-[#00244A] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-ces-orange blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <CESLogo width={96} />
          <h1 className="mt-4 text-center text-2xl font-bold text-ces-navy">CES Lead Generator</h1>
          <p className="mt-1 text-center text-sm text-ces-muted">Sign in to access your leads</p>
        </div>

        <div className="mt-6 flex gap-2 rounded-lg bg-slate-100 p-1">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === m ? 'bg-white text-ces-navy shadow-sm' : 'text-ces-muted hover:text-ces-text'
              }`}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button type="submit" className="btn-primary w-full">
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'reset' ? 'signin' : 'reset')}
          className="mt-4 w-full text-center text-xs text-ces-muted hover:text-ces-navy"
        >
          {mode === 'reset' ? 'Back to Sign In' : 'Forgot password?'}
        </button>
      </div>
    </div>
  )
}
