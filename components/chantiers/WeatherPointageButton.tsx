'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudLightning, Loader2, Check } from 'lucide-react'
import { addPointageAction } from '@/app/actions/pointage'

export default function WeatherPointageButton({ chantierId, chantierTitre }: { chantierId: string, chantierTitre: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handlePointage = async () => {
    if (!confirm(`Voulez-vous valider votre journée en "Intempérie" pour le chantier ${chantierTitre} ?`)) return
    
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await addPointageAction({
        chantierId,
        date: today,
        debut: "08:00",
        fin: "16:00",
        type: "INTEMPERIE",
        commentaire: "Pointage automatique (Chantier suspendu pour météo)"
      })
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Erreur lors du pointage")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100">
        <Check size={18} />
        Journée validée en Intempérie
      </div>
    )
  }

  return (
    <button
      onClick={handlePointage}
      disabled={loading}
      className="w-full flex items-center justify-between px-4 py-4 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-2xl border border-amber-200 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-200 rounded-lg group-hover:scale-110 transition-transform">
          <CloudLightning size={20} className="text-amber-900" />
        </div>
        <div className="text-left">
          <p className="text-sm font-black uppercase tracking-tight">Météo Défavorable</p>
          <p className="text-[10px] font-bold opacity-70 uppercase">Valider ma journée en intempérie</p>
        </div>
      </div>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  )
}
