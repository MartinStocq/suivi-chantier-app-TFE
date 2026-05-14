'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ChangerRoleButton({
  userId,
  roleActuel,
}: {
  userId: string
  roleActuel: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const nouveauRole = roleActuel === 'CHEF_CHANTIER' ? 'OUVRIER' : 'CHEF_CHANTIER'

  // Si on est déjà ouvrier, on ne peut pas être promu via ce bouton (sécurité UI additionnelle)
  if (roleActuel === 'OUVRIER') return null

  const handleClick = async () => {
    setLoading(true)
    await fetch(`/api/users/${userId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role: nouveauRole }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-500 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
    >
      {loading
        ? <Loader2 size={11} className="animate-spin" />
        : roleActuel === 'CHEF_CHANTIER' ? '→ Ouvrier' : '→ Chef'
      }
    </button>
  )
}