'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { StatutChantier } from '@prisma/client'

interface ChantierData {
  id:              string
  titre:           string
  description:     string | null
  statut:          StatutChantier
  dateDebutPrevue: string
  dateFinPrevue:   string | null
  client: {
    nom:       string
    telephone: string | null
    email:     string | null
  }
  adresse: {
    rue:        string
    numero:     string
    codePostal: string
    ville:      string
    pays:       string | null
  }
}

// Construire les options depuis l'enum Prisma réel
const STATUTS = Object.values(StatutChantier).map((v) => {
  const s = v as string
  return {
    value: v,
    label: s === 'ENATTENTE' || s === 'EN_ATTENTE'
      ? 'En attente'
      : s === 'ENCOURS' || s === 'EN_COURS'
      ? 'En cours'
      : s === 'TERMINE'
      ? 'Terminé'
      : s === 'SUSPENDU'
      ? 'Suspendu'
      : v,
  }
})

function toDateInput(iso: string | null) {
  if (!iso) return ''
  return iso.split('T')[0]
}

export default function ChantierEditForm({ chantier }: { chantier: ChantierData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    titre:           chantier.titre,
    description:     chantier.description ?? '',
    statut:          chantier.statut,
    dateDebutPrevue: toDateInput(chantier.dateDebutPrevue),
    dateFinPrevue:   toDateInput(chantier.dateFinPrevue),
    clientNom:       chantier.client.nom,
    clientTel:       chantier.client.telephone  ?? '',
    clientEmail:     chantier.client.email      ?? '',
    rue:             chantier.adresse.rue,
    numero:          chantier.adresse.numero,
    codePostal:      chantier.adresse.codePostal,
    ville:           chantier.adresse.ville,
    pays:            chantier.adresse.pays ?? 'Belgique',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/chantiers/${chantier.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre:           form.titre,
          description:     form.description   || null,
          statut:          form.statut,
          dateDebutPrevue: form.dateDebutPrevue,
          dateFinPrevue:   form.dateFinPrevue  || null,
          client: {
            nom:       form.clientNom,
            telephone: form.clientTel   || null,
            email:     form.clientEmail || null,
          },
          adresse: {
            rue:        form.rue,
            numero:     form.numero,
            codePostal: form.codePostal,
            ville:      form.ville,
            pays:       form.pays,
          },
        }),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}

      if (!res.ok) {
        setError(data.error ?? `Erreur ${res.status}`)
        setLoading(false)
        return
      }

      router.push(`/chantiers/${chantier.id}`)
      router.refresh()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
      setLoading(false)
    }
  }

  const inp =
    'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 ' +
    'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition'
  const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Général */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Informations générales</h2>

        <div>
          <label className={lbl}>Titre *</label>
          <input value={form.titre} onChange={set('titre')} className={inp} required />
        </div>

        <div>
          <label className={lbl}>Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className={inp + ' resize-none'}
            placeholder="Description du chantier..."
          />
        </div>

        <div>
          <label className={lbl}>Statut</label>
          <select value={form.statut} onChange={set('statut')} className={inp}>
            {STATUTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date de début *</label>
            <input type="date" value={form.dateDebutPrevue} onChange={set('dateDebutPrevue')} className={inp} required />
          </div>
          <div>
            <label className={lbl}>Date de fin prévue</label>
            <input type="date" value={form.dateFinPrevue} onChange={set('dateFinPrevue')} className={inp} />
          </div>
        </div>
      </div>

      {/* Client */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Client</h2>

        <div>
          <label className={lbl}>Nom *</label>
          <input value={form.clientNom} onChange={set('clientNom')} className={inp} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Téléphone</label>
            <input value={form.clientTel} onChange={set('clientTel')} className={inp} placeholder="+32 4xx xxx xxx" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={form.clientEmail} onChange={set('clientEmail')} className={inp} placeholder="client@exemple.com" />
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Adresse</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Rue *</label>
            <input value={form.rue} onChange={set('rue')} className={inp} required />
          </div>
          <div>
            <label className={lbl}>Numéro *</label>
            <input value={form.numero} onChange={set('numero')} className={inp} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Code postal *</label>
            <input value={form.codePostal} onChange={set('codePostal')} className={inp} required />
          </div>
          <div>
            <label className={lbl}>Ville *</label>
            <input value={form.ville} onChange={set('ville')} className={inp} required />
          </div>
        </div>

        <div>
          <label className={lbl}>Pays</label>
          <input value={form.pays} onChange={set('pays')} className={inp} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push(`/chantiers/${chantier.id}`)}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Enregistrer les modifications
        </button>
      </div>

    </form>
  )
}