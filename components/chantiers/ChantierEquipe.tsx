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

export default function ChantierEquipe({ affectations, isChef }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-900">👷 Équipe ({affectations.length})</h2>
        {isChef && <button className="text-sm text-green-600 hover:underline font-medium">+ Affecter</button>}
      </div>

      {affectations.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Aucun ouvrier affecté</p>
      ) : (
        <div className="space-y-3">
          {affectations.map(aff => (
            <div key={aff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm">
                  {aff.user.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{aff.user.nom}</p>
                  <p className="text-xs text-gray-400">{aff.user.email}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                aff.roleSurChantier === 'CHEF_CHANTIER'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {aff.roleSurChantier === 'CHEF_CHANTIER' ? '👷 Chef' : '🔧 Ouvrier'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
