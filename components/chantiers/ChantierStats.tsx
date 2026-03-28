interface Props { total: number; enCours: number; enAttente: number; termine: number }

export default function ChantierStats({ total, enCours, enAttente, termine }: Props) {
  const items = [
    { label: 'Total',      value: total,     border: 'border-gray-200'  },
    { label: 'En cours',   value: enCours,   border: 'border-blue-200'  },
    { label: 'En attente', value: enAttente, border: 'border-amber-200' },
    { label: 'Terminés',   value: termine,   border: 'border-emerald-200'},
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map(({ label, value, border }) => (
        <div key={label} className={`bg-white border ${border} rounded-xl p-5`}>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  )
}
