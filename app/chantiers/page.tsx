import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ChantierCalendar from '@/components/chantiers/ChantierCalendar'

export default async function ChantiersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const isChef = user.role === 'CHEF_CHANTIER'

  const chantiers = await prisma.chantier.findMany({
    include: {
      client:  true,
      adresse: true,
      _count:  { select: { affectations: true, photos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enCours = chantiers.filter(c => c.statut === 'EN_COURS')

  return (
    <AppLayout>
      <TopBar
        title="Chantiers"
        subtitle={`${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}`}
      />
      <main className="flex-1 px-8 py-8 space-y-6">

        {/* Chantiers en cours */}
        {enCours.length > 0 && (
          <div className="space-y-2">
            {enCours.map(c => (
              <Link key={c.id} href={`/chantiers/${c.id}`}>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between hover:bg-blue-100 transition cursor-pointer">
                  <div>
                    <p className="text-xs text-blue-400 mb-0.5">En cours</p>
                    <p className="text-sm font-semibold text-blue-900">{c.titre}</p>
                    {c.client && (
                      <p className="text-xs text-blue-400 mt-0.5">{c.client.nom}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-blue-500 tabular-nums">
                    {new Date(c.dateDebutPrevue).toLocaleDateString('fr-BE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <ChantierCalendar
          chantiers={chantiers.map(c => ({
            id:              c.id,
            titre:           c.titre,
            statut:          c.statut as string,
            dateDebutPrevue: c.dateDebutPrevue.toISOString(),
            dateFinPrevue:   c.dateFinPrevue?.toISOString() ?? null,
            client:          c.client ? { nom: c.client.nom } : null,
          }))}
          isChef={isChef}
        />

      </main>
    </AppLayout>
  )
}