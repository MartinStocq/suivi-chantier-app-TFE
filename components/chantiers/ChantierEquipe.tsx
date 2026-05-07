import Link from 'next/link'
import { Role } from '@prisma/client'
import Avatar from '@/components/ui/Avatar'

interface Membre {
  id: string
  roleSurChantier: Role
  user: { id: string; nom: string; email: string; avatarPath?: string | null }
  totalHeures?: number
}

interface Props {
  affectations: Membre[]
  isChef: boolean
}

export default function ChantierEquipe({ affectations, isChef }: Props) {
  if (affectations.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Aucun ouvrier affecté
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {affectations.map((a) => {
        return (
          <div key={a.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between w-full px-2 -mx-2">
              <div className="flex items-center gap-3">
                <Avatar nom={a.user.nom} avatarPath={a.user.avatarPath} size={28} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.user.nom}</p>
                  <p className="text-xs text-gray-400">{a.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(a.totalHeures !== undefined && a.totalHeures > 0) && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {a.totalHeures.toFixed(2).replace('.', ',')}h
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
                  {a.roleSurChantier === 'CHEF_CHANTIER' ? 'Chef' : 'Ouvrier'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
