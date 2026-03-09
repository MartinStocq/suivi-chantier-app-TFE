'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Crée le compte dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return alert(error.message)

    // 2. Crée le profil dans ta DB PostgreSQL
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.user?.id, nom, email })
    })

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleRegister}>
      <input value={nom} placeholder="Nom" onChange={e => setNom(e.target.value)} />
      <input value={email} type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input value={password} type="password" placeholder="Mot de passe" onChange={e => setPassword(e.target.value)} />
      <button type="submit">S'inscrire</button>
    </form>
  )
}
