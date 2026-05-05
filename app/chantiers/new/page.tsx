'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'

interface FormData {
  titre:          string
  description:    string
  statut:         string
  dateDebutPrevue: string
  dateFinPrevue:  string
  clientNom:      string
  clientTel:      string
  clientEmail:    string
  rue:            string
  numero:         string
  codePostal:     string
  ville:          string
  pays:           string
  latitude:       string
  longitude:      string
}

const empty: FormData = {
  titre: '', description: '', statut: 'EN_ATTENTE',
  dateDebutPrevue: '', dateFinPrevue: '',
  clientNom: '', clientTel: '', clientEmail: '',
  rue: '', numero: '', codePostal: '', ville: '', pays: 'Belgique',
  latitude: '', longitude: '',
}

export default function NouveauChantierPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/chantiers', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre:           form.titre,
        description:     form.description || null,
        statut:          form.statut,
        dateDebutPrevue: form.dateDebutPrevue,
        dateFinPrevue:   form.dateFinPrevue || null,
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
          latitude:   form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:  form.longitude ? parseFloat(form.longitude) : null,
        },
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la création')
      setLoading(false)
      return
    }

    const chantier = await res.json()
    router.push(`/chantiers/${chantier.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/chantiers" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Nouveau chantier</h1>
            <p className="text-xs text-gray-400 mt-0.5">Remplissez les informations pour planifier le chantier</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-8 py-8 space-y-6">

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Section chantier */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Informations du chantier</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Titre <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.titre} onChange={set('titre')} required
              placeholder="Ex : Rénovation façade — Rue de la Paix 12"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description} onChange={set('description')} rows={3}
              placeholder="Détails du chantier, travaux prévus..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Statut</label>
              <select
                value={form.statut} onChange={set('statut')}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              >
                <option value="ENATTENTE">En attente</option>
                <option value="TERMINE">Terminé</option>
                <option value="SUSPENDU">Suspendu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Date de début <span className="text-red-500">*</span></label>
              <input
                type="date" value={form.dateDebutPrevue} onChange={set('dateDebutPrevue')} required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Date de fin</label>
              <input
                type="date" value={form.dateFinPrevue} onChange={set('dateFinPrevue')}
                min={form.dateDebutPrevue}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Section client */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Client</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nom du client <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.clientNom} onChange={set('clientNom')} required
              placeholder="Ex : Dupont SPRL"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Téléphone</label>
              <input
                type="tel" value={form.clientTel} onChange={set('clientTel')}
                placeholder="+32 470 00 00 00"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={form.clientEmail} onChange={set('clientEmail')}
                placeholder="client@exemple.be"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Section adresse */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Adresse du chantier</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rue <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.rue} onChange={set('rue')} required
                placeholder="Rue de la Paix"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Numéro <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.numero} onChange={set('numero')} required
                placeholder="12"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Code postal <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.codePostal} onChange={set('codePostal')} required
                placeholder="1000"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Ville <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.ville} onChange={set('ville')} required
                placeholder="Bruxelles"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Pays</label>
              <input
                type="text" value={form.pays} onChange={set('pays')}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            La surveillance météo s&apos;activera automatiquement à partir de l&apos;adresse saisie.
          </p>
          </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Link href="/chantiers" className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
            Annuler
          </Link>
          <button
            type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Création...' : 'Créer le chantier'}
          </button>
        </div>

      </form>
    </div>
  )
}