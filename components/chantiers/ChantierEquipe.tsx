import { Role } from '@prisma/client'

interface Membre {
  id: string
  roleSurChantier: Role
  user: { nom: string; email: string }
}

interface Props {
  affectations: Membre[]
  isChef: boolean
}

export default function ChantierEquipe({ affectations }: Props) {
  if (affectations.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Aucun ouvrier affecté
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {affectations.map((a) => (
        <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold shrink-0">
              {a.user.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{a.user.nom}</p>
              <p className="text-xs text-gray-400">{a.user.email}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
            {a.roleSurChantier === 'CHEF_CHANTIER' ? 'Chef' : 'Ouvrier'}
          </span>
        </div>
      ))}
    </div>
  )
}
