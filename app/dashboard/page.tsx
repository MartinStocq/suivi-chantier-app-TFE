import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ApprouverButton from '@/components/ApprouverButton'
import SearchBar from '@/components/SearchBar'
import { HardHat, Plus, TrendingUp } from 'lucide-react'

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; u?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { q: qRaw, u: uRaw } = await searchParams
  const q = qRaw?.trim() ?? ''
  const u = uRaw?.trim() ?? ''

  const stats = await prisma.chantier.groupBy({ by: ['statut'], _count: true })
  const total     = stats.reduce((acc, s) => acc + s._count, 0)
  const enCours   = stats.find(s => s.statut === 'EN_COURS')?._count   ?? 0
  const enAttente = stats.find(s => s.statut === 'EN_ATTENTE')?._count ?? 0
  const termine   = stats.find(s => s.statut === 'TERMINE')?._count   ?? 0
  const suspendu  = stats.find(s => s.statut === 'SUSPENDU')?._count  ?? 0

  const recentChantiers = await prisma.chantier.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: q ? {
      OR: [
        { titre:   { contains: q, mode: 'insensitive' } },
        { client:  { nom:   { contains: q, mode: 'insensitive' } } },
        { adresse: { ville: { contains: q, mode: 'insensitive' } } },
      ]
    } : undefined,
    include: { client: true, adresse: true }
  })

  const comptesEnAttente = user.role === 'CHEF_CHANTIER'
    ? await prisma.utilisateur.findMany({
        where: {
          approuve: false,
          role: 'OUVRIER',
          ...(u ? {
            OR: [
              { nom:   { contains: u, mode: 'insensitive' } },
              { email: { contains: u, mode: 'insensitive' } },
            ]
          } : {})
        },
        orderBy: { nom: 'asc' }
      })
    : []

  return (
    <AppLayout>
      <TopBar title="Dashboard" subtitle={`Bienvenue, ${user.nom}`} />

      <main className="flex-1 px-8 py-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total chantiers', value: total,     color: 'border-gray-200'    },
            { label: 'En cours',        value: enCours,   color: 'border-blue-200'    },
            { label: 'En attente',      value: enAttente, color: 'border-amber-200'   },
            { label: 'Terminés',        value: termine,   color: 'border-emerald-200' },
            { label: 'Suspendus',       value: suspendu,  color: 'border-red-200'    },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-white border ${color} rounded-xl p-5`}>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chantiers récents */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-gray-900 shrink-0">Chantiers récents</h2>
              <SearchBar key={q} placeholder="Rechercher un chantier..." paramKey="q" />
              <Link href="/chantiers" className="text-xs text-gray-400 hover:text-gray-700 transition shrink-0">
                Voir tout
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentChantiers.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-400">
                    {q ? `Aucun résultat pour « ${q} »` : 'Aucun chantier créé'}
                  </p>
                </div>
              ) : recentChantiers.map(c => (
                <Link key={c.id} href={`/chantiers/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition group">
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-black">{c.titre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.client.nom} · {c.adresse.ville}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                    c.statut === 'EN_COURS'   ? 'bg-blue-50 text-blue-700 border-blue-200'          :
                    c.statut === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700 border-amber-200'       :
                    c.statut === 'TERMINE'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {c.statut === 'EN_COURS'   ? 'En cours'   :
                     c.statut === 'EN_ATTENTE' ? 'En attente' :
                     c.statut === 'TERMINE'   ? 'Terminé'    : 'Suspendu'}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 px-1">Actions rapides</h2>

            <Link href="/chantiers"
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition group">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition">
                <HardHat size={15} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Voir les chantiers</p>
                <p className="text-xs text-gray-500">{total} au total</p>
              </div>
            </Link>

            {user.role === 'CHEF_CHANTIER' && (
              <Link href="/chantiers/new"
                className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-900 rounded-xl hover:bg-gray-800 transition group">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Plus size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Nouveau chantier</p>
                  <p className="text-xs text-gray-400">Créer un chantier</p>
                </div>
              </Link>
            )}

            <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <TrendingUp size={15} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Taux d'avancement</p>
                <p className="text-xs text-gray-500">
                  {total > 0 ? Math.round((termine / total) * 100) : 0}% terminés
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ouvriers en attente — Chef seulement */}
        {user.role === 'CHEF_CHANTIER' && (
          <div className="mt-6 bg-white border border-amber-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 shrink-0">Ouvriers en attente</h2>
              {comptesEnAttente.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-md font-medium">
                  {comptesEnAttente.length}
                </span>
              )}
              <SearchBar key={u} placeholder="Rechercher par nom..." paramKey="u" />
            </div>
            <div className="divide-y divide-gray-50">
              {comptesEnAttente.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-500">
                    {u ? `Aucun résultat pour « ${u} »` : 'Aucun ouvrier en attente'}
                  </p>
                </div>
              ) : comptesEnAttente.map(compte => (
                <div key={compte.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{compte.nom}</p>
                    <p className="text-xs font-medium text-gray-700">{compte.email}</p>
                  </div>
                  <ApprouverButton userId={compte.id} />
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </AppLayout>
  )
}