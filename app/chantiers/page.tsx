import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import StatutBadge from '@/components/ui/StatutBadge'
import ChantierStats from '@/components/chantiers/ChantierStats'
import { Plus, MapPin } from 'lucide-react'

export default async function ChantiersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const chantiers = await prisma.chantier.findMany({
    include: { client: true, adresse: true, _count: { select: { affectations: true, photos: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <AppLayout>
      <TopBar title="Chantiers" subtitle={`${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}`} />

      <main className="flex-1 px-8 py-8">

        <div className="flex justify-between items-center mb-6">
          <ChantierStats
            total={chantiers.length}
            enCours={chantiers.filter(c => c.statut === 'EN_COURS').length}
            enAttente={chantiers.filter(c => c.statut === 'EN_ATTENTE').length}
            termine={chantiers.filter(c => c.statut === 'TERMINE').length}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900">Tous les chantiers</h2>
            {user.role === 'CHEF_CHANTIER' && (
              <Link href="/chantiers/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition">
                <Plus size={13} />
                Nouveau chantier
              </Link>
            )}
          </div>

          {chantiers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 mb-4">Aucun chantier pour le moment</p>
              {user.role === 'CHEF_CHANTIER' && (
                <Link href="/chantiers/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition">
                  <Plus size={14} /> Créer le premier chantier
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Chantier</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Localisation</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Début</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Équipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {chantiers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition group">
                    <td className="px-5 py-3.5">
                      <Link href={`/chantiers/${c.id}`}
                        className="text-sm font-medium text-gray-900 group-hover:text-black hover:underline">
                        {c.titre}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.client.nom}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <MapPin size={11} />{c.adresse.ville}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatutBadge statut={c.statut} /></td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 tabular-nums">
                      {new Date(c.dateDebutPrevue).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{c._count.affectations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </AppLayout>
  )
}

