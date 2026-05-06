import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { autoUpdateChantierStatuts } from '@/lib/chantiers'
import { autoUpdateMeteo, getForecast, checkWeatherFavorability } from '@/lib/meteo'
import Link from 'next/link'
import StatutBadge from '@/components/ui/StatutBadge'
import ChantierEquipe from '@/components/chantiers/ChantierEquipe'
import ChantierPhotosGrid from '@/components/chantiers/ChantierPhotosGrid'
import StatutInline from '@/components/chantiers/StatutInline'
import PhotoUpload from '@/components/PhotoUpload'
import Avatar from '@/components/ui/Avatar'
import MeteoSyncButton from '@/components/chantiers/MeteoSyncButton'
import ExportButton from '@/components/chantiers/ExportButton'

import {
  ArrowLeft, Pencil, MapPin, User, Calendar,
  Phone, Mail, Image, Users, ClipboardList,
  Wind, Droplets, Clock
} from 'lucide-react'

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Mise à jour automatique des statuts et de la météo
  await autoUpdateChantierStatuts()
  await autoUpdateMeteo()

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
      meteoSnapshots: { orderBy: { dateSnapshot: 'desc' }, take: 1 },
      pointages: {
        orderBy: { date: 'desc' },
        include: { utilisateur: { select: { nom: true, avatarPath: true } } }
      }
    },
  })
  if (!chantier) notFound()

  // Calcul du total d'heures
  const statsHeures = await prisma.pointage.aggregate({
    where: { chantierId: id },
    _sum: { duree: true }
  })
  const totalHeures = statsHeures._sum.duree || 0
  const isChef = user.role === 'CHEF_CHANTIER'

  // Groupement des heures par utilisateur
  const pointagesGrouped = await prisma.pointage.groupBy({
    by: ['utilisateurId'],
    where: { chantierId: id },
    _sum: { duree: true }
  })

  // Mapper les heures vers les affectations
  const affectationsWithHours = chantier.affectations.map(a => ({
    ...a,
    totalHeures: pointagesGrouped.find(p => p.utilisateurId === a.userId)?._sum.duree || 0
  }))

  // Météo Actuelle
  const lastMeteo = chantier.meteoSnapshots[0]
  const meteoData = lastMeteo ? JSON.parse(lastMeteo.payload) : null
  const currentMeteo = meteoData?.current

  // Prévisions dynamiques
  
  let forecastDays: any[] = []
  let scheduledMeteo = null

  if (chantier.adresse.latitude && chantier.adresse.longitude) {
    const fullForecast = await getForecast(chantier.adresse.latitude, chantier.adresse.longitude)
    if (fullForecast) {
      // 1. Trouver la météo prévue pour le jour du début (existant)
      const dStart = new Date(chantier.dateDebutPrevue)
      const dateStartStr = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`
      const startIdx = fullForecast.findIndex((f: any) => f.date === dateStartStr)
      if (startIdx !== -1) {
        scheduledMeteo = {
          code: fullForecast[startIdx].weatherCode,
          max: fullForecast[startIdx].tempMax,
          min: fullForecast[startIdx].tempMin,
        }
      }

      // 2. Calculer les prévisions à afficher (Timeline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Nombre de jours à afficher : du jour même jusqu'à la fin (max 5)
      let daysToShow = 3 // Par défaut
      if (chantier.dateFinPrevue) {
        const dEnd = new Date(chantier.dateFinPrevue)
        const diffTime = dEnd.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        daysToShow = Math.max(1, Math.min(5, diffDays + 1))
      }

      forecastDays = fullForecast.slice(0, daysToShow)
    }
  }

  const getWeatherIcon = (code: number) => {
    const hour = new Date().getHours()
    const isNight = hour >= 22 || hour < 6

    if (code === 0) return isNight ? '🌙' : '☀️'
    if (code === 1) return isNight ? '☁️' : '🌤️'
    if (code === 2) return isNight ? '☁️' : '⛅'
    if (code === 3) return '☁️'
    if (code <= 48) return '🌫️'
    if (code <= 55) return '🌦️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '❄️'
    if (code <= 82) return '🌧️'
    if (code <= 86) return '🌨️'
    if (code <= 99) return '⛈️'
    return '🌡️'
  }

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
                    ? <StatutInline chantierId={chantier.id} statut={chantier.statut} dateDebutPrevue={chantier.dateDebutPrevue.toISOString()} />
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
              <div className="flex items-center gap-2">
                <ExportButton chantierId={id} />
                <Link href={`/chantiers/${id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200
                             rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                  <Pencil size={12} />
                  Modifier
                </Link>
              </div>
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
            <ChantierEquipe affectations={affectationsWithHours as never} isChef={isChef} />
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
              {!(user.role === 'OUVRIER' && chantier.statut === 'TERMINE') && (
                <PhotoUpload
                  chantierId={chantier.id}
                  takenById={user.id}
                />
              )}
            </div>
            <ChantierPhotosGrid
              photos={chantier.photos}
              totalPhotos={chantier._count.photos}
              chantierId={id}
              canDelete={!(user.role === 'OUVRIER' && chantier.statut === 'TERMINE')}
            />
          </div>

          {/* Météo (Déplacé sous les photos) */}
          {chantier.statut !== 'TERMINE' && !(chantier.dateFinPrevue && new Date() > new Date(chantier.dateFinPrevue) && chantier.statut !== 'EN_COURS') && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Wind size={14} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Surveillance Météo</h2>
                </div>
                <MeteoSyncButton />
              </div>

              <div className="space-y-6">
                {/* Affichage Unifié de la Météo */}
                {(currentMeteo || scheduledMeteo) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Colonne Gauche: État Actuel */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-3">
                          {currentMeteo 
                            ? `Dernière mise à jour : ${new Date(lastMeteo.dateSnapshot).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`
                            : `Le ${new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })} (Début prévu)`
                          }
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-5xl">
                              {getWeatherIcon(currentMeteo ? currentMeteo.weather_code : (scheduledMeteo?.code ?? 0))}
                            </span>
                            <div>
                              <p className="text-3xl font-black text-gray-900 tabular-nums">
                                {Math.round(currentMeteo ? currentMeteo.temperature_2m : (scheduledMeteo?.max ?? 0))}°C
                              </p>
                              <p className="text-[11px] text-gray-500 uppercase font-bold tracking-tight">
                                {currentMeteo ? 'Conditions actuelles' : 'Maximum prévu'}
                              </p>
                            </div>
                          </div>
                          {(() => {
                            const data = currentMeteo || {};
                            const temp = data.temperature_2m || 0;
                            const precip = data.precipitation || 0;
                            const wind = data.wind_speed_10m || 0;
                            const code = currentMeteo ? data.weather_code : (scheduledMeteo?.code || 0);
                            const { isFavorable } = checkWeatherFavorability(temp, precip, wind, code);

                            return (
                              <span className={!isFavorable 
                                ? "px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[11px] font-black uppercase tracking-tighter" 
                                : "px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[11px] font-black uppercase tracking-tighter"
                              }>
                                {!isFavorable ? "⚠️ ARRÊT" : "✅ OK"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {currentMeteo && (
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-200/50">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white rounded-lg border border-gray-100">
                              <Wind size={16} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase font-bold leading-none mb-1.5">Vent</p>
                              <p className="text-sm font-black text-gray-900 leading-none">
                                {currentMeteo.wind_speed_10m} <span className="text-[10px] font-medium text-gray-400 uppercase">km/h</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white rounded-lg border border-gray-100">
                              <Droplets size={16} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase font-bold leading-none mb-1.5">Pluie</p>
                              <p className="text-sm font-black text-gray-900 leading-none">
                                {currentMeteo.precipitation} <span className="text-[10px] font-medium text-gray-400 uppercase">mm/h</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Colonne Droite: Prévisions Timeline */}
                    {forecastDays.length > 0 && (
                      <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-5">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-5">Prévisions ({forecastDays.length} jours)</p>
                        <div className="flex justify-between items-end gap-2 h-[100px]">
                          {forecastDays.map((f, idx) => {
                            const dStart = new Date(chantier.dateDebutPrevue);
                            const dateStartStr = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
                            const isStartDay = f.date === dateStartStr;

                            const isEndDay = chantier.dateFinPrevue && (() => {
                              const dEnd = new Date(chantier.dateFinPrevue);
                              const dateEndStr = `${dEnd.getFullYear()}-${String(dEnd.getMonth() + 1).padStart(2, '0')}-${String(dEnd.getDate()).padStart(2, '0')}`;
                              return f.date === dateEndStr;
                            })();

                            return (
                              <div key={idx} className="flex flex-col items-center flex-1 group">
                                <div className="flex flex-col items-center mb-2 transition-transform group-hover:-translate-y-1">
                                  <span className="text-2xl mb-1">{getWeatherIcon(f.weatherCode)}</span>
                                  <p className="text-xs font-black text-gray-900 tabular-nums">{Math.round(f.tempMax)}°</p>
                                  <p className="text-[10px] font-medium text-gray-400 tabular-nums">{Math.round(f.tempMin)}°</p>
                                </div>
                                <div className="w-full flex flex-col items-center pt-2 border-t border-gray-200">
                                  <p className="text-[10px] font-black text-gray-400 uppercase">
                                    {idx === 0 ? 'Auj.' : new Date(f.date).toLocaleDateString('fr-BE', { weekday: 'short' }).replace('.', '')}
                                  </p>
                                  {isStartDay && (
                                    <span className="mt-1 px-1 py-0.5 bg-blue-600 text-[6px] text-white font-black uppercase rounded-[2px] tracking-tighter">
                                      Début
                                    </span>
                                  )}
                                  {isEndDay && (
                                    <span className="mt-1 px-1 py-0.5 bg-amber-600 text-[6px] text-white font-black uppercase rounded-[2px] tracking-tighter">
                                      Fin
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 italic font-medium">Position en cours de détection...</p>
                    <div className="mt-4"><MeteoSyncButton label="Lancer la détection" /></div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 italic">
                    Données fournies par Open-Meteo
                  </p>
                </div>
              </div>
            </div>
          )}

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
                {(chantier.adresse.latitude && chantier.adresse.longitude) && (
                  <p className="text-[10px] text-gray-400 mt-2 font-mono">
                    {chantier.adresse.latitude.toFixed(4)}, {chantier.adresse.longitude.toFixed(4)}
                  </p>
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

          {/* Dernières prestations */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock size={12} className="text-gray-400" />
              Dernières prestations
            </h2>
            <div className="space-y-3">
              {chantier.pointages.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun pointage</p>
              ) : (
                chantier.pointages.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Avatar nom={p.utilisateur.nom} avatarPath={p.utilisateur.avatarPath} size={20} />
                      <span className="font-medium text-gray-700">{p.utilisateur.nom.split(' ')[0]}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{p.duree.toFixed(2).replace('.', ',')}h</p>
                      <p className="text-[9px] text-gray-400">{new Date(p.date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Créé par */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Créé par
            </h2>
            <div className="flex items-center gap-2.5">
              <Avatar
                nom={chantier.createdBy.nom}
                avatarPath={chantier.createdBy.avatarPath}
                size={28}
              />
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