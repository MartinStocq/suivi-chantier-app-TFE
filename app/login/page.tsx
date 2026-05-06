'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.refresh(); router.push('/dashboard') }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        }
      }
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex">

      {/* Panneau gauche */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12 fixed left-0 top-0 h-screen">

        <span className="text-white font-semibold text-sm tracking-tight">Suivi Chantier</span>

        {/* Centre */}
        <div>
          <div className="mb-10">
            <div className="w-10 h-0.5 bg-gray-600 mb-8" />
            <h2 className="text-white text-2xl font-semibold leading-snug mb-4">
              Pilotez vos chantiers<br />avec précision.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Planification, suivi terrain, gestion d'équipe et rapports — tout centralisé en un seul outil.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              'Suivi en temps réel de l&apos;avancement',
              'Gestion des affectations par chantier',
              'Upload photos avant / après travaux',
              'Exports et rapports PDF / CSV',
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
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Connexion</h1>
            <p className="text-sm text-gray-400">Bienvenue, entrez vos identifiants</p>
          </div>

          {error && (
            <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-gray-700">Mot de passe</label>
                <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition">
                  Mot de passe oublié ?
                </a>
              </div>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Connexion...</> : 'Se connecter'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <hr className="flex-1 border-gray-100" />
            <span className="text-xs text-gray-300">ou</span>
            <hr className="flex-1 border-gray-100" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2.5 text-sm font-medium text-gray-600"
          >
            <svg width="15" height="15" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-gray-700 font-medium hover:text-gray-900 transition">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
