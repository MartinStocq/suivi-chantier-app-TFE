import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import SearchBar from '@/components/SearchBar'
import ChangerRoleButton from '@/components/equipe/ChangerRoleButton'
import SupprimerMembreButton from '@/components/equipe/SupprimerMembreButton'
import { Users, HardHat, Wrench } from 'lucide-react'

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtre?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'CHEF_CHANTIER') redirect('/dashboard')

  const { q: qRaw, filtre } = await searchParams
  const q = qRaw?.trim() ?? ''

  const membres = await prisma.utilisateur.findMany({
    where: {
      approuve: true,
      ...(q ? {
        OR: [
          { nom:   { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ]
      } : {}),
      ...(filtre === 'ouvrier' ? { role: 'OUVRIER'       } : {}),
      ...(filtre === 'chef'    ? { role: 'CHEF_CHANTIER' } : {}),
    },
    include: {
      _count: { select: { affectations: true } }
    },
    orderBy: [{ nom: 'asc' }],
  })

  // Chefs en premier, ouvriers ensuite
  const sorted = [
    ...membres.filter(m => m.role === 'CHEF_CHANTIER'),
    ...membres.filter(m => m.role !== 'CHEF_CHANTIER'),
  ]

  const totalOuvriers = await prisma.utilisateur.count({ where: { role: 'OUVRIER',       approuve: true } })
  const totalChefs    = await prisma.utilisateur.count({ where: { role: 'CHEF_CHANTIER', approuve: true } })

  return (
    <AppLayout>
      <TopBar title="Équipe" subtitle={`${totalOuvriers + totalChefs} membre${totalOuvriers + totalChefs > 1 ? 's' : ''}`} />

      <main className="flex-1 px-8 py-8">

        {/* KPIs — Chefs à gauche, Ouvriers à droite */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-blue-200 rounded-xl p-5">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalChefs}</p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">Chefs de chantier</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalOuvriers}</p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">Ouvriers</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <h2 className="text-sm font-semibold text-gray-900 shrink-0">Tous les membres</h2>

            {/* Filtres */}
            <div className="flex items-center gap-2">
              {[
                { label: 'Tous',    value: undefined  },
                { label: 'Chefs',   value: 'chef'     },
                { label: 'Ouvriers', value: 'ouvrier' },
              ].map(f => (
                <a
                  key={f.label}
                  href={`/utilisateurs${f.value ? `?filtre=${f.value}` : ''}`}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                    filtre === f.value || (!filtre && !f.value)
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>

            <div className="ml-auto">
              <SearchBar key={q} placeholder="Rechercher par nom ou email.." paramKey="q" />
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                {q ? `Aucun résultat pour « ${q} »` : 'Aucun membre'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Membre</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Rôle</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition group">

                    {/* Membre */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {m.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.nom}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rôle */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border font-medium ${
                        m.role === 'CHEF_CHANTIER'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {m.role === 'CHEF_CHANTIER'
                          ? <><HardHat size={11} />Chef de chantier</>
                          : <><Wrench size={11} />Ouvrier</>
                        }
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      {m.id !== user.id && (
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition">
                          <ChangerRoleButton userId={m.id} roleActuel={m.role} />
                          <SupprimerMembreButton userId={m.id} nom={m.nom} />
                        </div>
                      )}
                    </td>

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