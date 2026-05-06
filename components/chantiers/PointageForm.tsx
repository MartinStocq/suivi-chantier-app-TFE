'use client'

import { useState, useTransition } from 'react'
import { addPointageAction } from '@/app/actions/pointage'
import { Clock, Loader2, CheckCircle2 } from 'lucide-react'

interface Chantier {
  id: string
  titre: string
  dateDebutPrevue: string | Date
  dateFinPrevue?: string | Date | null
}

interface PointageFormProps {
  chantiers: Chantier[]
}

export default function PointageForm({ chantiers }: PointageFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedChantierId, setSelectedChantierId] = useState<string>('')

  const today = new Date().toISOString().split('T')[0]

  const selectedChantier = chantiers.find(c => c.id === selectedChantierId)
  
  const minDate = selectedChantier 
    ? new Date(selectedChantier.dateDebutPrevue).toISOString().split('T')[0]
    : undefined
    
  const maxDate = selectedChantier?.dateFinPrevue
    ? new Date(selectedChantier.dateFinPrevue).toISOString().split('T')[0]
    : undefined

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const data = {
      chantierId: formData.get('chantierId') as string,
      date: formData.get('date') as string,
      debut: formData.get('debut') as string,
      fin: formData.get('fin') as string,
      commentaire: formData.get('commentaire') as string,
    }

    if (!data.chantierId || !data.date || !data.debut || !data.fin) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    startTransition(async () => {
      try {
        await addPointageAction(data)
        setSuccess(true)
        setSelectedChantierId('')
        // Reset le formulaire
        const form = e.target as HTMLFormElement
        form.reset()
        // Masquer le message de succès après 3 secondes
        setTimeout(() => setSuccess(false), 3000)
      } catch (err: any) {
        setError(err.message || "Une erreur est survenue")
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Clock size={16} className="text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-900">Pointer mes heures</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="space-y-3">
          {/* Sélection du chantier */}
          <div>
            <label htmlFor="chantierId" className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">
              Chantier
            </label>
            <select
              id="chantierId"
              name="chantierId"
              required
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">Sélectionner un chantier...</option>
              {chantiers.map(c => (
                <option key={c.id} value={c.id}>{c.titre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                defaultValue={today}
                min={minDate}
                max={maxDate}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Heure début */}
            <div>
              <label htmlFor="debut" className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">
                Début
              </label>
              <input
                type="time"
                id="debut"
                name="debut"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Heure fin */}
            <div>
              <label htmlFor="fin" className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">
                Fin
              </label>
              <input
                type="time"
                id="fin"
                name="fin"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label htmlFor="commentaire" className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">
              Commentaire (optionnel)
            </label>
            <textarea
              id="commentaire"
              name="commentaire"
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
              placeholder="Travaux effectués, remarques..."
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
            ⚠️ {error}
          </p>
        )}

        {success && (
          <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={14} /> Heures enregistrées avec succès !
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer mes heures"
          )}
        </button>
      </form>
    </div>
  )
}
