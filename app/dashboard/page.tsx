import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { autoUpdateChantierStatuts } from '@/lib/chantiers'
import { autoUpdateMeteo } from '@/lib/meteo'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ApprouverButton from '@/components/ApprouverButton'
import SearchBar from '@/components/SearchBar'
import PointageForm from '@/components/chantiers/PointageForm'
import Avatar from '@/components/ui/Avatar'
import { HardHat, Plus, TrendingUp, Clock, CalendarDays } from 'lucide-react'

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; u?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Mise à jour automatique des statuts et de la météo
  await autoUpdateChantierStatuts()
  await autoUpdateMeteo()

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

  const accountsWaiting = user.role === 'CHEF_CHANTIER'
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

  // Données spécifiques chef : Dernier pointage par ouvrier
  let workersLatestPointages: any[] = []
  if (user.role === 'CHEF_CHANTIER') {
    const workers = await prisma.utilisateur.findMany({
      where: { role: 'OUVRIER', approuve: true },
      select: { 
        id: true, 
        nom: true, 
        avatarPath: true,
        pointages: {
          orderBy: { date: 'desc' },
          take: 1,
          include: { chantier: { select: { titre: true } } }
        }
      }
    })
    workersLatestPointages = workers.filter(w => w.pointages.length > 0)
  }

  // Données spécifiques ouvrier
  let assignedChantiers: { id: string; titre: string }[] = []
  let recentPointages: any[] = []
  let weekHours = 0

  if (user.role === 'OUVRIER') {
    assignedChantiers = (await prisma.chantier.findMany({
      where: {
        affectations: { some: { userId: user.id } },
        statut: 'EN_COURS'
      },
      select: { 
        id: true, 
        titre: true,
        dateDebutPrevue: true,
        dateFinPrevue: true
      }
    })) as any[]

    recentPointages = await prisma.pointage.findMany({
      where: { utilisateurId: user.id },
      orderBy: { date: 'desc' },
      take: 5,
      include: { chantier: { select: { titre: true } } }
    })

    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Ajuster au Lundi
    startOfWeek.setDate(diff)

    const aggregate = await prisma.pointage.aggregate({
      where: {
        utilisateurId: user.id,
        date: { gte: startOfWeek }
      },
      _sum: { duree: true }
    })
    weekHours = aggregate._sum.duree || 0
  }

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

          {/* Colonne Gauche / Principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pointage pour l'ouvrier */}
            {user.role === 'OUVRIER' && (
              <PointageForm chantiers={assignedChantiers} />
            )}

            {/* Chantiers récents */}
            <div className="bg-white border border-gray-200 rounded-xl">
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
          </div>

          {/* Sidebar / Colonne Droite */}
          <div className="space-y-6">

            {/* Résumé Pointage (Ouvrier seulement) */}
            {user.role === 'OUVRIER' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Mes heures</h2>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                    <Clock size={10} />
                    {weekHours}h cette semaine
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {recentPointages.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">Aucun pointage récent</p>
                  ) : (
                    <div className="space-y-3">
                      {recentPointages.map((p: any) => (
                        <div key={p.id} className="flex items-start justify-between gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{p.chantier.titre}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5 font-medium">
                              <CalendarDays size={10} />
                              {new Date(p.date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}
                              <span>•</span>
                              {new Date(p.debut).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })} - {new Date(p.fin).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className="text-xs font-black text-gray-700 tabular-nums bg-gray-50 px-2 py-1 rounded">
                            {p.duree}h
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  <p className="text-sm font-medium text-gray-900">Taux d&apos;avancement</p>
                  <p className="text-xs text-gray-500">
                    {total > 0 ? Math.round((termine / total) * 100) : 0}% terminés
                  </p>
                </div>
              </div>
            </div>

            {/* Derniers pointages par ouvrier — Chef seulement */}
            {user.role === 'CHEF_CHANTIER' && workersLatestPointages.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Activité de l&apos;équipe</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dernier pointage</p>
                </div>
                <div className="p-4 space-y-3">
                  {workersLatestPointages.map((w: any) => {
                    const lp = w.pointages[0];
                    return (
                      <Link key={w.id} href={`/utilisateurs/${w.id}/pointages`}
                        className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-100 transition group">
                        <div className="flex items-center gap-3">
                          <Avatar nom={w.nom} avatarPath={w.avatarPath} size={32} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{w.nom}</p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              {lp.chantier.titre}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-900">{lp.duree}h</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                            {new Date(lp.date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ouvriers en attente — Chef seulement */}
            {user.role === 'CHEF_CHANTIER' && (
              <div className="bg-white border border-amber-200 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-900 shrink-0">Ouvriers en attente</h2>
                  {accountsWaiting.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-md font-medium">
                      {accountsWaiting.length}
                    </span>
                  )}
                  <SearchBar key={u} placeholder="Rechercher par nom..." paramKey="u" />
                </div>
                <div className="divide-y divide-gray-50">
                  {accountsWaiting.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm text-gray-500">
                        {u ? `Aucun résultat pour « ${u} »` : 'Aucun ouvrier en attente'}
                      </p>
                    </div>
                  ) : accountsWaiting.map(compte => (
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
          </div>
        </div>

      </main>
    </AppLayout>
  )
}