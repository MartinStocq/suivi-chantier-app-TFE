import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ExportOuvrierButton from '@/components/equipe/ExportOuvrierButton'
import DeletePointageButton from '@/components/chantiers/DeletePointageButton'
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react'

export default async function UtilisateurPointagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const { start, end } = await searchParams

  // Sécurité : Un ouvrier ne peut voir que son propre historique
  if (user.role !== 'CHEF_CHANTIER' && user.id !== id) {
    redirect(`/utilisateurs/${user.id}/pointages`)
  }

  const filters: any = { utilisateurId: id }
  if (start || end) {
    filters.date = {}
    if (start) filters.date.gte = new Date(start)
    if (end) filters.date.lte = new Date(end)
  }

  const membre = await prisma.utilisateur.findUnique({
    where: { id },
    include: {
      pointages: {
        where: filters.date ? { date: filters.date } : undefined,
        orderBy: { date: 'desc' },
        include: { chantier: { select: { titre: true } } }
      }
    },
  })

  if (!membre) notFound()

  // Calculer les heures par mois
  const pointagesByMonth: Record<string, { month: string, year: number, total: number, pointages: any[] }> = {}
  membre.pointages.forEach(p => {
    const d = new Date(p.date)
    const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!pointagesByMonth[monthKey]) {
      pointagesByMonth[monthKey] = {
        month: d.toLocaleDateString('fr-BE', { month: 'long' }),
        year: d.getFullYear(),
        total: 0,
        pointages: []
      }
    }
    pointagesByMonth[monthKey].total += p.duree
    pointagesByMonth[monthKey].pointages.push(p)
  })

  const monthlyHistory = Object.entries(pointagesByMonth)
    .sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }))
    .map(entry => entry[1])

  return (
    <AppLayout>
      <TopBar title="Historique des heures" subtitle={membre.nom} />

      <main className="flex-1 px-8 py-8 max-w-3xl mx-auto w-full">

        {/* Retour et Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/utilisateurs/${id}`}
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition"
          >
            <ArrowLeft size={13} />
            Retour à la fiche
          </Link>

          {user.role === 'CHEF_CHANTIER' && (
            <ExportOuvrierButton userId={membre.id} nom={membre.nom} />
          )}
        </div>

        {/* Filtres par date */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Filtrer l&apos;historique</p>
          <form className="flex items-center gap-2">
            <input 
              type="date" 
              name="start" 
              defaultValue={start}
              className="text-[10px] px-2 py-1 border border-gray-200 rounded-md text-black focus:outline-none focus:ring-1 focus:ring-blue-500" 
            />
            <span className="text-gray-300 text-[10px]">à</span>
            <input 
              type="date" 
              name="end" 
              defaultValue={end}
              className="text-[10px] px-2 py-1 border border-gray-200 rounded-md text-black focus:outline-none focus:ring-1 focus:ring-blue-500" 
            />
            <button type="submit" className="bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded-md font-bold hover:bg-gray-800 transition">
              Filtrer
            </button>
            {(start || end) && (
              <Link href={`/utilisateurs/${id}/pointages`} className="text-[10px] text-red-500 font-bold hover:underline ml-1">
                Effacer
              </Link>
            )}
          </form>
        </div>

        {/* En-tête membre */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar nom={membre.nom} avatarPath={membre.avatarPath} size={48} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{membre.nom}</h1>
            <p className="text-sm text-gray-500">
              {start || end ? 'Résultats du filtrage' : 'Récapitulatif mensuel des prestations'}
            </p>
          </div>
        </div>

        {/* Historique des pointages */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {monthlyHistory.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400 italic">Aucun pointage enregistré pour ce membre.</p>
              </div>
            ) : (
              monthlyHistory.map((m, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-black text-gray-900 capitalize flex items-center gap-2">
                      <CalendarDays size={14} className="text-blue-500" />
                      {m.month} {m.year}
                    </h3>
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      {m.total.toFixed(2).replace('.', ',')}h prestées
                    </span>
                  </div>

                  <div className="space-y-3">
                    {m.pointages.map((p) => {
                      const typeLabels: Record<string, string> = {
                        TRAVAIL: 'Travail',
                        MALADIE: 'Maladie',
                        CONGE_PAYE: 'Congé Payé',
                        CONGE_SANS_SOLDE: 'Congé sans solde',
                        INTEMPERIE: 'Intempérie'
                      }
                      const displayTitle = p.chantier?.titre || `Absence : ${typeLabels[p.type] || 'Générale'}`

                      return (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{displayTitle}</p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 font-medium">
                              <span className="bg-white px-1.5 py-0.5 rounded border border-gray-100 text-gray-500">
                                {new Date(p.date).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(p.debut).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(p.fin).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-black text-gray-900">{p.duree.toFixed(2).replace('.', ',')}h</p>
                              {user.role === 'CHEF_CHANTIER' && (
                                <DeletePointageButton pointageId={p.id} />
                              )}
                            </div>
                            {p.commentaire && (
                              <p className="text-[10px] text-gray-400 mt-1 italic truncate max-w-[200px]" title={p.commentaire}>
                                &quot;{p.commentaire}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </AppLayout>
  )
}
