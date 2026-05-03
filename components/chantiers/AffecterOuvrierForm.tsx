'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'

interface Ouvrier {
  id:         string
  nom:        string
  email:      string
  avatarPath?: string | null
}

interface Affectation {
  userId: string
  user:   Ouvrier
}

export default function AffecterOuvrierForm({
  chantierId,
  tousOuvriers,
  affectations,
}: {
  chantierId:   string
  tousOuvriers: Ouvrier[]
  affectations: Affectation[]
}) {
  const router  = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState('')

  const affectesIds = new Set(affectations.map(a => a.userId))

  const toggle = async (userId: string, isAffecte: boolean) => {
    setLoading(userId)
    setError('')

    const res = await fetch(`/api/chantiers/${chantierId}/affectations`, {
      method:  isAffecte ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur')
    }

    setLoading(null)
    router.refresh()
  }

  const affectes    = tousOuvriers.filter(o =>  affectesIds.has(o.id))
  const disponibles = tousOuvriers.filter(o => !affectesIds.has(o.id))

  return (
    <div className="space-y-6">

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Ouvriers affectés */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Équipe affectée
            <span className="ml-1.5 text-gray-400 font-normal">({affectes.length})</span>
          </h2>
        </div>

        {affectes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun ouvrier affecté</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {affectes.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar nom={o.nom} avatarPath={o.avatarPath} size={28} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.nom}</p>
                    <p className="text-xs text-gray-400">{o.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(o.id, true)}
                  disabled={loading === o.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             text-red-600 border border-red-200 rounded-lg hover:bg-red-50
                             disabled:opacity-50 transition"
                >
                  {loading === o.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <UserMinus size={12} />
                  }
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ouvriers disponibles */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Ouvriers disponibles
            <span className="ml-1.5 text-gray-400 font-normal">({disponibles.length})</span>
          </h2>
        </div>

        {disponibles.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Tous les ouvriers sont déjà affectés</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {disponibles.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar nom={o.nom} avatarPath={o.avatarPath} size={28} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.nom}</p>
                    <p className="text-xs text-gray-400">{o.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(o.id, false)}
                  disabled={loading === o.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50
                             disabled:opacity-50 transition"
                >
                  {loading === o.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <UserPlus size={12} />
                  }
                  Affecter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}