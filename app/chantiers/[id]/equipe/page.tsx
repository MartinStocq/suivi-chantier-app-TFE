import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AffecterOuvrierForm from '@/components/chantiers/AffecterOuvrierForm'
import { ArrowLeft } from 'lucide-react'

export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'CHEF_CHANTIER') redirect('/chantiers')

  const { id } = await params

  const chantier = await prisma.chantier.findUnique({
    where: { id },
    include: {
      affectations: {
        include: { user: true },
      },
    },
  })

  if (!chantier) notFound()

  const tousOuvriers = await prisma.utilisateur.findMany({
    where:   { role: 'OUVRIER', approuve: true },
    orderBy: { nom: 'asc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-8 py-5">
          <div className="flex items-center gap-3">
            <Link href={`/chantiers/${id}`} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={16} className="text-gray-500" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Gérer l&apos;équipe</h1>
              <p className="text-xs text-gray-400 mt-0.5">{chantier.titre}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-8 py-8">
        <AffecterOuvrierForm
          chantierId={id}
          tousOuvriers={tousOuvriers.map(o => ({
            id:         o.id,
            nom:        o.nom,
            email:      o.email,
            avatarPath: o.avatarPath, // ← ajouté
          }))}
          affectations={chantier.affectations.map(a => ({
            userId: a.userId,
            user: {
              id:         a.user.id,
              nom:        a.user.nom,
              email:      a.user.email,
              avatarPath: a.user.avatarPath, // ← ajouté
            },
          }))}
        />
      </div>
    </div>
  )
}