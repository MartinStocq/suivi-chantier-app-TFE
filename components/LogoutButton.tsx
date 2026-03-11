'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition text-sm"
    >
      🚪 Déconnexion
    </button>
  )
}
