'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function AttenteValidationPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-gray-200 rounded-xl p-8 text-center">

        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>

        <h1 className="text-base font-semibold text-gray-900 mb-2">
          Compte en attente de validation
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          Votre compte a bien été créé. Un chef de chantier doit l'approuver avant que vous puissiez accéder à l'application.
        </p>

        <p className="text-xs text-gray-300 mb-6">
          Contactez votre responsable si vous attendez depuis trop longtemps.
        </p>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition"
        >
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}