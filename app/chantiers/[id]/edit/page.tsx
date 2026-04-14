import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ChantierEditForm from '@/components/chantiers/ChantierEditForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ChantierEditPage({
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
    include: { client: true, adresse: true },
  })

  if (!chantier) notFound()

  // Construire explicitement l'objet — pas de spread Prisma
  const data = {
    id:              chantier.id,
    titre:           chantier.titre,
    description:     chantier.description ?? null,
    statut:          chantier.statut,
    dateDebutPrevue: chantier.dateDebutPrevue.toISOString(),
    dateFinPrevue:   chantier.dateFinPrevue?.toISOString() ?? null,
    client: {
      nom:       chantier.client.nom,
      telephone: chantier.client.telephone ?? null,
      email:     chantier.client.email     ?? null,
    },
    adresse: {
      rue:        chantier.adresse.rue,
      numero:     chantier.adresse.numero,
      codePostal: chantier.adresse.codePostal,
      ville:      chantier.adresse.ville,
      pays:       chantier.adresse.pays ?? 'Belgique',
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center gap-3">
          <Link href={`/chantiers/${id}`} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Modifier le chantier</h1>
            <p className="text-xs text-gray-400 mt-0.5">{chantier.titre}</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <ChantierEditForm chantier={data} />
      </div>
    </div>
  )
}