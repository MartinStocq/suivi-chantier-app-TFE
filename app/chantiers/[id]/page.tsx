import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import StatutBadge from '@/components/ui/StatutBadge'
import ChantierEquipe from '@/components/chantiers/ChantierEquipe'
import ChantierPhotosGrid from '@/components/chantiers/ChantierPhotosGrid'

export default async function ChantierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const chantier = await prisma.chantier.findUnique({
    where: { id },
    include: {
      client: true,
      adresse: true,
      createdBy: true,
      affectations: { include: { user: true } },
      photos: { orderBy: { takenAt: 'desc' }, take: 6 },
      _count: { select: { photos: true } }
    }
  })
  if (!chantier) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/dashboard" className="hover:text-green-600">Dashboard</Link>
              <span>/</span>
              <Link href="/chantiers" className="hover:text-green-600">Chantiers</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{chantier.titre}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{chantier.titre}</h1>
              <StatutBadge statut={chantier.statut} />
            </div>
          </div>
          {user.role === 'CHEF_CHANTIER' && (
            <Link href={`/chantiers/${id}/edit`} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              ✏️ Modifier
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {chantier.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">📋 Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{chantier.description}</p>
            </div>
          )}
          <ChantierEquipe affectations={chantier.affectations} isChef={user.role === 'CHEF_CHANTIER'} />
          <ChantierPhotosGrid photos={chantier.photos} totalPhotos={chantier._count.photos} chantierId={id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">ℹ️ Informations</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</p>
                <p className="font-medium text-gray-900">{chantier.client.nom}</p>
                {chantier.client.telephone && <p className="text-gray-500">{chantier.client.telephone}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Adresse</p>
                <p className="text-gray-700">{chantier.adresse.rue} {chantier.adresse.numero}</p>
                <p className="text-gray-500">{chantier.adresse.codePostal} {chantier.adresse.ville}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dates</p>
                <p className="text-gray-700">📅 Début : {new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE')}</p>
                {chantier.dateFinPrevue && (
                  <p className="text-gray-700">🏁 Fin : {new Date(chantier.dateFinPrevue).toLocaleDateString('fr-BE')}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Créé par</p>
                <p className="text-gray-700">{chantier.createdBy.nom}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
