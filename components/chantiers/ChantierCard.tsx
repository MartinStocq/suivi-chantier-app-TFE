import Link from 'next/link'
import StatutBadge from '@/components/ui/StatutBadge'
import { StatutChantier } from '@prisma/client'
import { MapPin, Users, Camera, ArrowRight } from 'lucide-react'

interface Props {
  chantier: {
    id: string
    titre: string
    statut: StatutChantier
    dateDebutPrevue: Date
    dateFinPrevue: Date | null
    client: { nom: string }
    adresse: { rue: string; numero: string; ville: string }
    _count: { affectations: number; photos: number }
  }
}

export default function ChantierCard({ chantier }: Props) {
  return (
    <Link
      href={`/chantiers/${chantier.id}`}
      className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <StatutBadge statut={chantier.statut} />
        <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5" />
      </div>

      <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-black transition-colors line-clamp-1">
        {chantier.titre}
      </h3>
      <p className="text-sm text-gray-500 mb-3">{chantier.client.nom}</p>

      <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
        <MapPin size={11} />
        <span>{chantier.adresse.rue} {chantier.adresse.numero}, {chantier.adresse.ville}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Users size={11} />{chantier._count.affectations}</span>
          <span className="flex items-center gap-1"><Camera size={11} />{chantier._count.photos}</span>
        </div>
      </div>
    </Link>
  )
}
