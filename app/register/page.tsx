'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [nom, setNom]           = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.user?.id, nom, email })
    })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex">

      {/* Panneau gauche — même que login */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12 fixed left-0 top-0 h-screen">

        <span className="text-white font-semibold text-sm tracking-tight">Suivi Chantier</span>

        <div>
          <div className="w-10 h-0.5 bg-gray-600 mb-8" />
          <h2 className="text-white text-2xl font-semibold leading-snug mb-4">
            Rejoignez votre équipe<br />dès maintenant.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-10">
            Créez votre compte et accédez à tous vos chantiers en quelques secondes.
          </p>

          <div className="space-y-3">
            {[
              'Accès immédiat à vos chantiers',
              'Consultation des affectations en cours',
              'Upload et consultation de photos terrain',
              'Interface simple et intuitive',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1 h-1 rounded-full bg-gray-500 shrink-0" />
                <span className="text-gray-400 text-xs">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-xs">© 2026 Suivi Chantier</p>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 lg:ml-[50%] flex items-center justify-center min-h-screen bg-white px-8">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Créer un compte</h1>
            <p className="text-sm text-gray-400">Remplissez les informations ci-dessous</p>
          </div>

          {error && (
            <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nom complet</label>
              <input
                type="text"
                value={nom}
                placeholder="Jean Dupont"
                onChange={e => setNom(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Adresse email</label>
              <input
                type="email"
                value={email}
                placeholder="nom@entreprise.com"
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                placeholder="8 caractères minimum"
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Création...</> : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-gray-700 font-medium hover:text-gray-900 transition">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
