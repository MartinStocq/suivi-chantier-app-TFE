import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TypeActionJournal } from '@prisma/client'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import Avatar from '@/components/ui/Avatar'
import { 
  FilePlus, 
  RefreshCcw, 
  Camera, 
  UserPlus, 
  UserMinus, 
  History,
  ArrowRight,
  Clock,
  CalendarDays
} from 'lucide-react'

// Configuration visuelle pour chaque type d'action
const actionConfig: Record<TypeActionJournal, { 
  label: string, 
  icon: React.ElementType, 
  colorClass: string,
  bgClass: string,
  borderClass: string
}> = {
  CREATION_CHANTIER: { 
    label: 'Création', 
    icon: FilePlus, 
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-100'
  },
  CHANGEMENT_STATUT: { 
    label: 'Statut', 
    icon: RefreshCcw, 
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-100'
  },
  AJOUT_PHOTO: { 
    label: 'Photo', 
    icon: Camera, 
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-100'
  },
  AFFECTATION_OUVRIER: { 
    label: 'Équipe', 
    icon: UserPlus, 
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-100'
  },
  RETRAIT_OUVRIER: { 
    label: 'Équipe', 
    icon: UserMinus, 
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-100'
  },
  POINTAGE: { 
    label: 'Heures', 
    icon: Clock, 
    colorClass: 'text-gray-600',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200'
  },
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>
}) {
  const user = await getCurrentUser()
  
  // Sécurité : Uniquement CHEF_CHANTIER
  if (!user || user.role !== 'CHEF_CHANTIER') {
    redirect('/dashboard')
  }

  const { u: filterUserId } = await searchParams
  const activeUserId = filterUserId || null

  // Récupération de tous les utilisateurs approuvés (pour le filtre)
  const users = await prisma.utilisateur.findMany({
    where: { approuve: true },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, avatarPath: true, role: true }
  })

  // Récupération des actions triées par date décroissante
  const actions = await prisma.actionJournal.findMany({
    where: activeUserId ? { auteurId: activeUserId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      chantier: { select: { id: true, titre: true } },
      auteur:   { select: { id: true, nom: true, avatarPath: true } }
    }
  })

  return (
    <AppLayout>
      <TopBar 
        title="Journal d'activité" 
        subtitle="Historique complet des actions effectuées sur tous les chantiers" 
      />

      <main className="flex-1 px-8 py-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex items-center gap-2 text-gray-400 mb-6">
            <History size={18} />
            <span className="text-sm font-medium uppercase tracking-wider">Fil d&apos;actualité</span>
          </div>

          {/* Filtres par Utilisateur */}
          <div className="mb-8">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 px-1">Filtrer par membre</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Link 
                href="/journal"
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!activeUserId ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >
                Tous
              </Link>
              {users.map((u) => (
                <Link 
                  key={u.id}
                  href={`/journal?u=${u.id}`}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${activeUserId === u.id ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                  <Avatar nom={u.nom} avatarPath={u.avatarPath} size={20} />
                  <span>{u.id === user.id ? 'Moi' : u.nom}</span>
                  {u.role === 'CHEF_CHANTIER' && u.id !== user.id && (
                    <span className="text-[8px] opacity-60 bg-white/20 px-1 rounded">CHEF</span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="text-gray-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune activité trouvée</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                {activeUserId 
                  ? "Cet utilisateur n'a pas encore effectué d'actions enregistrées." 
                  : "Les actions importantes effectuées sur les chantiers apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((action) => {
                const config = actionConfig[action.action]
                const Icon = config.icon
                const date = new Date(action.createdAt)
                const isMe = action.auteurId === user.id
                
                return (
                  <div 
                    key={action.id} 
                    className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      
                      {/* Icone d'action */}
                      <div className={`${config.bgClass} ${config.colorClass} ${config.borderClass} border p-3 rounded-xl flex-shrink-0`}>
                        <Icon size={20} strokeWidth={2.5} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Ligne du haut : Auteur et Action */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar nom={action.auteur.nom} avatarPath={action.auteur.avatarPath} size={24} />
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{action.auteur.nom}</span>
                              {isMe && (
                                <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] font-black rounded uppercase">Vous</span>
                              )}
                            </div>
                            <span className="text-gray-400 text-sm">•</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${config.bgClass} ${config.colorClass} ${config.borderClass} border`}>
                              {config.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                            <Clock size={12} />
                            {new Intl.DateTimeFormat('fr-BE', { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            }).format(date)}
                          </div>
                        </div>

                        {/* Description / Détails */}
                        <p className="text-gray-700 text-sm leading-relaxed font-medium mb-4">
                          {action.details || 'Aucun détail supplémentaire.'}
                        </p>

                        {/* Footer de la carte */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-50">
                          
                          {/* Date complète */}
                          <div className="text-gray-400 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                            <CalendarDays size={12} />
                            {new Intl.DateTimeFormat('fr-BE', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric'
                            }).format(date)}
                          </div>

                          {/* Lien vers le chantier (si présent) */}
                          {action.chantier ? (
                            <Link 
                              href={`/chantiers/${action.chantier.id}`}
                              className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-black hover:bg-gray-900 hover:text-white transition-colors group/link"
                            >
                              <span className="opacity-60 font-bold">Chantier:</span>
                              <span>{action.chantier.titre}</span>
                              <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 text-gray-400 rounded-lg text-[11px] font-medium italic">
                              Aucun chantier lié
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
)
}
