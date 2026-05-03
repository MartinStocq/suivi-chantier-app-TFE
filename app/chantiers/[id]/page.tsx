import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import StatutBadge from '@/components/ui/StatutBadge'
import ChantierEquipe from '@/components/chantiers/ChantierEquipe'
import ChantierPhotosGrid from '@/components/chantiers/ChantierPhotosGrid'
import StatutInline from '@/components/chantiers/StatutInline'
import PhotoUpload from '@/components/PhotoUpload'
import {
  ArrowLeft, Pencil, MapPin, User, Calendar,
  Phone, Mail, Image, Users, ClipboardList
} from 'lucide-react'

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  const chantier = await prisma.chantier.findUnique({
    where: { id },
    include: {
      client:    true,
      adresse:   true,
      createdBy: true,
      affectations: { include: { user: true } },
      photos:    { orderBy: { takenAt: 'desc' }, take: 6 },
      _count:    { select: { photos: true } },
    },
  })
  if (!chantier) notFound()

  const isChef = user.role === 'CHEF_CHANTIER'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-5">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Link href="/dashboard" className="hover:text-gray-600 transition">Dashboard</Link>
            <span>/</span>
            <Link href="/chantiers" className="hover:text-gray-600 transition">Chantiers</Link>
            <span>/</span>
            <span className="text-gray-700">{chantier.titre}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Link href="/chantiers" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft size={16} className="text-gray-500" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">{chantier.titre}</h1>
                  {isChef
                    ? <StatutInline chantierId={chantier.id} statut={chantier.statut} />
                    : <StatutBadge statut={chantier.statut} />
                  }
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                  <MapPin size={11} />
                  <span>{chantier.adresse.rue} {chantier.adresse.numero}, {chantier.adresse.ville}</span>
                </div>
              </div>
            </div>

            {isChef && (
              <Link href={`/chantiers/${id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200
                           rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                <Pencil size={12} />
                Modifier
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          {chantier.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Description</h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {chantier.description}
              </p>
            </div>
          )}

          {/* Équipe */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Équipe
                  <span className="ml-1.5 text-gray-400 font-normal">
                    {chantier.affectations.length}
                  </span>
                </h2>
              </div>
              {isChef && (
                <Link href={`/chantiers/${id}/equipe`}
                  className="text-xs text-gray-500 hover:text-gray-900 transition font-medium">
                  Affecter
                </Link>
              )}
            </div>
            <ChantierEquipe affectations={chantier.affectations} isChef={false} />
          </div>

          {/* Photos */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Image size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Photos
                  <span className="ml-1.5 text-gray-400 font-normal">
                    {chantier._count.photos}
                  </span>
                </h2>
              </div>
              <PhotoUpload
                chantierId={chantier.id}
                takenById={user.id}
              
              />
            </div>
            <ChantierPhotosGrid
              photos={chantier.photos}
              totalPhotos={chantier._count.photos}
              chantierId={id}
            />
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Client */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Client
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <User size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-gray-900">{chantier.client.nom}</p>
              </div>
              {chantier.client.telephone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-600">{chantier.client.telephone}</p>
                </div>
              )}
              {chantier.client.email && (
                <div className="flex items-center gap-2.5">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-600">{chantier.client.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Adresse
            </h2>
            <div className="flex items-start gap-2.5">
              <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  {chantier.adresse.rue} {chantier.adresse.numero}
                </p>
                <p className="text-sm text-gray-500">
                  {chantier.adresse.codePostal} {chantier.adresse.ville}
                </p>
                {chantier.adresse.pays && (
                  <p className="text-xs text-gray-400 mt-0.5">{chantier.adresse.pays}</p>
                )}
              </div>
            </div>
          </div>

          {/* Planification */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Planification
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Calendar size={13} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Début prévu</p>
                  <p className="text-sm text-gray-700 tabular-nums">
                    {new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              {chantier.dateFinPrevue && (
                <div className="flex items-center gap-2.5">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Fin prévue</p>
                    <p className="text-sm text-gray-700 tabular-nums">
                      {new Date(chantier.dateFinPrevue).toLocaleDateString('fr-BE', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Créé par */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Créé par
            </h2>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center
                              text-white text-xs font-semibold shrink-0">
                {chantier.createdBy.nom.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{chantier.createdBy.nom}</p>
                <p className="text-xs text-gray-400">{chantier.createdBy.email}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}