import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const creds = { email, password }
    const { data, error } =
      mode === 'signin' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds)
    if (error) setMessage(error.message)
    else if (mode === 'signup' && !data.session) setMessage('Check your email to confirm your account, then sign in.')
    setBusy(false)
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '20vh auto', display: 'grid', gap: 12, padding: 16 }}>
      <h1>Locked In</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
      />
      <button disabled={busy}>{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
      {message && <p role="alert">{message}</p>}
    </form>
  )
}
