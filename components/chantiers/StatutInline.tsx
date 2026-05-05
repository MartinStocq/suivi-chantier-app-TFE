'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatutChantier } from '@prisma/client'

const STATUTS: {
  value: StatutChantier
  label: string
  active: string
  idle: string
}[] = [
  {
    value:  StatutChantier.EN_ATTENTE,
    label:  'En attente',
    active: 'bg-amber-100 text-amber-700 border-amber-300 font-semibold',
    idle:   'bg-white text-gray-400 border-gray-200 hover:border-amber-200 hover:text-amber-600',
  },
  {
    value:  StatutChantier.EN_COURS,
    label:  'En cours',
    active: 'bg-blue-100 text-blue-700 border-blue-300 font-semibold',
    idle:   'bg-white text-gray-400 border-gray-200 hover:border-blue-200 hover:text-blue-600',
  },
  {
    value:  StatutChantier.TERMINE,
    label:  'Terminé',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold',
    idle:   'bg-white text-gray-400 border-gray-200 hover:border-emerald-200 hover:text-emerald-600',
  },
  {
    value:  StatutChantier.SUSPENDU,
    label:  'Suspendu',
    active: 'bg-red-100 text-red-600 border-red-300 font-semibold',
    idle:   'bg-white text-gray-400 border-gray-200 hover:border-red-200 hover:text-red-500',
  },
]

export default function StatutInline({
  chantierId,
  statut,
  dateDebutPrevue,
}: {
  chantierId: string
  statut: StatutChantier
  dateDebutPrevue: string
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(statut)
  const [saving,  setSaving]  = useState<StatutChantier | null>(null)

  const isFuture = new Date(dateDebutPrevue).getTime() > new Date().setHours(23, 59, 59, 999)

  const handleChange = async (newStatut: StatutChantier) => {
    if (newStatut === current || saving) return

    if (newStatut === StatutChantier.EN_COURS) {
      alert("Le passage en statut 'En cours' est automatique le jour du début du chantier.")
      return
    }

    setSaving(newStatut)
    const res = await fetch(`/api/chantiers/${chantierId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ statut: newStatut }),
    })
    if (res.ok) {
      setCurrent(newStatut)
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || "Erreur lors de la mise à jour")
    }
    setSaving(null)
  }

  return (
    <div className="flex items-center gap-1.5">
      {STATUTS.map(s => {
        const isEnCours = s.value === StatutChantier.EN_COURS
        // "En cours" est toujours automatique (sauf s'il l'est déjà)
        const disabled = isEnCours && current !== StatutChantier.EN_COURS

        return (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            disabled={saving !== null || (disabled && current !== s.value)}
            title={disabled ? "Le passage 'En cours' est automatique" : s.label}
            className={[
              'px-2.5 py-1 rounded-lg border text-xs transition-all',
              saving === s.value ? 'opacity-50 cursor-wait' : (disabled && current !== s.value ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'),
              current === s.value ? s.active : s.idle,
            ].join(' ')}
          >
            {saving === s.value ? '...' : s.label}
          </button>
        )
      })}
    </div>
  )
  }