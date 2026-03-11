import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function Dashboard() {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard 🏗️</h1>
            <p className="text-gray-500 mt-1">Bonjour, <span className="font-medium text-gray-800">{user.nom}</span></p>
          </div>
          <LogoutButton />
        </div>

        {/* Badge rôle */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            user.role === 'CHEF_CHANTIER'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {user.role === 'CHEF_CHANTIER' ? '👷 Chef de chantier' : '🔧 Ouvrier'}
          </span>
        </div>

        {/* Contenu selon le rôle */}
        {user.role === 'CHEF_CHANTIER' && (
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <h2 className="font-semibold text-orange-800 mb-1">Espace Chef</h2>
            <p className="text-sm text-orange-600">Vous pouvez créer et gérer des chantiers.</p>
          </div>
        )}

        {user.role === 'OUVRIER' && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h2 className="font-semibold text-blue-800 mb-1">Espace Ouvrier</h2>
            <p className="text-sm text-blue-600">Vous pouvez consulter vos chantiers et pointer.</p>
          </div>
        )}
      </div>
    </div>
  )
}


