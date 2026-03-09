'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else router.push('/dashboard')
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/dashboard'
      }
    })
    if (error) alert(error.message)
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        placeholder="Mot de passe"
        onChange={e => setPassword(e.target.value)}
      />
      <button type="submit">Se connecter</button>
      <button type="button" onClick={handleGoogleLogin}>
        Se connecter avec Google
      </button>
    </form>
  )
}
