import Link from 'next/link'
import { Role } from '@prisma/client'
import Avatar from '@/components/ui/Avatar'

interface Membre {
  id: string
  roleSurChantier: Role
  user: { id: string; nom: string; email: string; avatarPath?: string | null }
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
        <div key={a.id} className="py-3 first:pt-0 last:pb-0">
          <Link
            href={`/utilisateurs/${a.user.id}`}
            className="flex items-center justify-between w-full hover:opacity-75 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <Avatar nom={a.user.nom} avatarPath={a.user.avatarPath} size={28} />
              <div>
                <p className="text-sm font-medium text-gray-900">{a.user.nom}</p>
                <p className="text-xs text-gray-400">{a.user.email}</p>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium pointer-events-none">
              {a.roleSurChantier === 'CHEF_CHANTIER' ? 'Chef' : 'Ouvrier'}
            </span>
          </Link>
        </div>
      ))}
    </div>
  )
}
