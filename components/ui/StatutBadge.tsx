import { StatutChantier } from '@prisma/client'

const config: Record<StatutChantier, { label: string; color: string; dot: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700  bg-amber-50  border-amber-200',  dot: 'bg-amber-400'  },
  EN_COURS:   { label: 'En cours',   color: 'text-blue-700   bg-blue-50   border-blue-200',   dot: 'bg-blue-500'   },
  TERMINE:    { label: 'Terminé',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  SUSPENDU:   { label: 'Suspendu',   color: 'text-red-700    bg-red-50    border-red-200',     dot: 'bg-red-400'    },
}

export default function StatutBadge({ statut }: { statut: StatutChantier }) {
  const s = config[statut]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
