import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ExportOuvrierButton from '@/components/equipe/ExportOuvrierButton'
import { ArrowLeft, Mail, Phone, HardHat, Wrench, Calendar, ClipboardList, Clock } from 'lucide-react'

export default async function UtilisateurFichePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  const membre = await prisma.utilisateur.findUnique({
    where: { id },
    include: {
      affectations: {
        include: {
          chantier: {
            include: { adresse: true }
          }
        },
        orderBy: { dateDebut: 'desc' },
      },
    },
  })

  if (!membre) notFound()

  const canSeePointages = user.role === 'CHEF_CHANTIER' || user.id === membre.id

  return (
    <AppLayout>
      <TopBar title="Fiche membre" subtitle={membre.nom} />

      <main className="flex-1 px-8 py-8 max-w-3xl mx-auto w-full">

        {/* Retour et Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/utilisateurs"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition"
          >
            <ArrowLeft size={13} />
            Retour à l&apos;équipe
          </Link>

          {user.role === 'CHEF_CHANTIER' && (
            <ExportOuvrierButton userId={membre.id} nom={membre.nom} />
          )}
        </div>

        {/* Carte profil */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar nom={membre.nom} avatarPath={membre.avatarPath} size={56} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{membre.nom}</h2>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border font-medium mt-1 ${
                membre.role === 'CHEF_CHANTIER'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {membre.role === 'CHEF_CHANTIER'
                  ? <><HardHat size={11} /> Chef de chantier</>
                  : <><Wrench size={11} /> Ouvrier</>
                }
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-3">
              <Mail size={13} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-700">{membre.email}</p>
            </div>
            {membre.telephone && (
              <div className="flex items-center gap-3">
                <Phone size={13} className="text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">{membre.telephone}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500">
                Membre depuis le{' '}
                {new Date(membre.createdAt).toLocaleDateString('fr-BE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {canSeePointages && (
            <div className="mt-6">
              <Link
                href={`/utilisateurs/${membre.id}/pointages`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all group"
              >
                <Clock size={14} className="group-hover:animate-pulse" />
                Voir l&apos;historique des prestations
              </Link>
            </div>
          )}
        </div>

        {/* Chantiers affectés */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Chantiers affectés
              <span className="ml-1.5 text-gray-400 font-normal">
                ({membre.affectations.length})
              </span>
            </h2>
          </div>

          {membre.affectations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">Aucun chantier affecté</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {membre.affectations.map(a => (
                <Link
                  key={a.id}
                  href={`/chantiers/${a.chantierId}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.chantier.titre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.chantier.adresse.rue} {a.chantier.adresse.numero}, {a.chantier.adresse.ville}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                    a.chantier.statut === 'EN_COURS'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    a.chantier.statut === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    a.chantier.statut === 'TERMINE'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {a.chantier.statut === 'EN_COURS'   ? 'En cours' :
                     a.chantier.statut === 'EN_ATTENTE' ? 'En attente' :
                     a.chantier.statut === 'TERMINE'    ? 'Terminé' : 'Suspendu'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </AppLayout>
  )
}