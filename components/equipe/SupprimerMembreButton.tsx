'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

export default function SupprimerMembreButton({
  userId,
  nom,
}: {
  userId: string
  nom: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    if (!confirm(`Supprimer ${nom} de l'équipe ?`)) return
    setLoading(true)
    await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
    </button>
  )
}