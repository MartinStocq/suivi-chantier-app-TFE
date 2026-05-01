import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StatutChantier } from '@prisma/client'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ChantierStats from '@/components/chantiers/ChantierStats'
import ChantierCalendar from '@/components/chantiers/ChantierCalendar'
import StatutBadge from '@/components/ui/StatutBadge'
import StatutInline from '@/components/chantiers/StatutInline'
import { MapPin, Plus } from 'lucide-react'

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

  return (
    <AppLayout>
      <TopBar
        title="Chantiers"
        subtitle={`${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}`}
      />
      <main className="flex-1 px-8 py-8 space-y-6">

        <ChantierStats
          total={chantiers.length}
          enCours={chantiers.filter(c => c.statut === StatutChantier.EN_COURS).length}
          enAttente={chantiers.filter(c => c.statut === StatutChantier.EN_ATTENTE).length}
          termine={chantiers.filter(c => c.statut === StatutChantier.TERMINE).length}
          suspendu={chantiers.filter(c => c.statut === StatutChantier.SUSPENDU).length}

        />

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