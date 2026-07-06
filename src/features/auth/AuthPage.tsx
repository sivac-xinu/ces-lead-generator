import { useState } from 'react'
import { useAuth } from './AuthProvider'

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ces-bg p-4">
      <div className="w-full max-w-md rounded-xl border border-ces-border bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ces-navy">CES Lead Generator</h1>
        <p className="mt-2 text-center text-sm text-ces-muted">Sign in to access your leads</p>

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
