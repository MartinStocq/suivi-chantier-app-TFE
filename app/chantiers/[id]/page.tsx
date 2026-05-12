import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { autoUpdateChantierStatuts } from '@/lib/chantiers'
import { autoUpdateMeteo, getForecast, checkWeatherFavorability, getCoordinates } from '@/lib/meteo'
import { getSignedPhotoUrl } from '@/lib/storage'
import Link from 'next/link'
import StatutBadge from '@/components/ui/StatutBadge'
import ChantierEquipe from '@/components/chantiers/ChantierEquipe'
import ChantierPhotosGrid from '@/components/chantiers/ChantierPhotosGrid'
import StatutInline from '@/components/chantiers/StatutInline'
import PhotoUpload from '@/components/PhotoUpload'
import Avatar from '@/components/ui/Avatar'
import MeteoSyncButton from '@/components/chantiers/MeteoSyncButton'
import ExportButton from '@/components/chantiers/ExportButton'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'

import {
  ArrowLeft, Pencil, MapPin, User, Calendar,
  Phone, Mail, Image, Users, ClipboardList,
  Wind, Droplets, Clock, HardHat
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

  // Génération des URLs signées pour les photos
  const photosWithSignedUrls = await Promise.all(
    chantier.photos.map(async (p) => ({
      ...p,
      signedUrl: await getSignedPhotoUrl(p.storagePath)
    }))
  )

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

  let lat = chantier.adresse.latitude
  let lon = chantier.adresse.longitude

  // 1. Récupération robuste des coordonnées si manquantes
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    const coords = await getCoordinates(chantier.adresse.ville).catch(() => null)
    if (coords) {
      lat = coords.latitude
      lon = coords.longitude
      // Mise à jour asynchrone
      prisma.adresse.update({
        where: { id: chantier.adresse.id },
        data: { latitude: lat, longitude: lon }
      }).catch(() => {})
    }
  }

  // 2. Récupération des prévisions
  if (lat !== null && lon !== null) {
    try {
      const fullForecast = await getForecast(lat, lon)
      if (fullForecast && fullForecast.length > 0) {
        // Météo pour le jour de début prévu
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

        // On affiche toujours 5 jours de prévisions
        forecastDays = fullForecast.slice(0, 5)
      }
    } catch (e) {
      console.error("Erreur lors de la récupération du forecast:", e)
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
    <AppLayout>
      <TopBar title={chantier.titre} subtitle="Détails du chantier" />

      <main className="flex-1 px-4 md:px-8 py-6 md:py-8 space-y-6">
        
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/chantiers" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Retour aux chantiers</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <MeteoSyncButton />
            <ExportButton chantierId={id} />
            {isChef && (
              <Link href={`/chantiers/${id}/edit`} 
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all">
                <Pencil size={14} />
                Modifier
              </Link>
            )}
          </div>
        </div>

        {/* Layout Principal */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          
          {/* Colonne Principale (Gauche sur Desktop) */}
          <div className="contents lg:block lg:col-span-2 lg:space-y-6">
            
            {/* 1. Bannière Principale (Nom & Statut) */}
            <div className="order-1 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 md:p-8 relative overflow-hidden lg:mb-6">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none hidden sm:block">
                <HardHat size={200} />
              </div>

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {isChef
                    ? <StatutInline chantierId={chantier.id} statut={chantier.statut} dateDebutPrevue={chantier.dateDebutPrevue.toISOString()} />
                    : <StatutBadge statut={chantier.statut} />
                  }
                  <span className="text-xs text-gray-300">|</span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                     <Calendar size={14} />
                     <span>{new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE')}</span>
                     {chantier.dateFinPrevue && <span>→ {new Date(chantier.dateFinPrevue).toLocaleDateString('fr-BE')}</span>}
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">{chantier.titre}</h2>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <MapPin size={14} />
                  <span>{chantier.adresse.rue} {chantier.adresse.numero}, {chantier.adresse.ville}</span>
                </div>
              </div>
            </div>

            {/* 4. Équipe (Mobile: 4th) */}
            <div className="order-4 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                    Équipe ({chantier.affectations.length})
                  </h3>
                </div>
                {isChef && (
                  <Link href={`/chantiers/${id}/equipe`} className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wider">
                    Gérer
                  </Link>
                )}
              </div>
              <ChantierEquipe affectations={affectationsWithHours as never} isChef={isChef} />
            </div>

            {/* 5. Photos (Mobile: 5th) */}
            <div className="order-5 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Image size={16} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                    Photos ({chantier._count.photos})
                  </h3>
                </div>
                {!(user.role === 'OUVRIER' && chantier.statut === 'TERMINE') && (
                  <PhotoUpload chantierId={chantier.id} takenById={user.id} />
                )}
              </div>
              <ChantierPhotosGrid
                photos={photosWithSignedUrls as any}
                totalPhotos={chantier._count.photos}
                chantierId={id}
                canDelete={!(user.role === 'OUVRIER' && chantier.statut === 'TERMINE')}
              />
            </div>

            {/* 8. Description (Mobile: 8th) */}
            {chantier.description && (
              <div className="order-8 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList size={16} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Description</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {chantier.description}
                </p>
              </div>
            )}
          </div>

          {/* Colonne Latérale (Droite sur Desktop) */}
          <div className="contents lg:block lg:space-y-6">
            
            {/* 2. Info Client (Mobile: 2nd) */}
            <div className="order-2 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <User size={14} className="text-blue-500" /> Client
              </h3>
              <div className="space-y-5">
                <div>
                  <p className="text-base font-black text-gray-900">{chantier.client.nom}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Donneur d&apos;ordre</p>
                </div>
                <div className="flex flex-col gap-2">
                  {chantier.client.telephone && (
                    <a href={`tel:${chantier.client.telephone}`} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                      <Phone size={14} className="text-gray-400" /> {chantier.client.telephone}
                    </a>
                  )}
                  {chantier.client.email && (
                    <a href={`mailto:${chantier.client.email}`} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                      <Mail size={14} className="text-gray-400" /> {chantier.client.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Localisation (Mobile: 3rd) */}
            <div className="order-3 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <MapPin size={14} className="text-emerald-500" /> Chantier
              </h3>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">{chantier.adresse.numero} {chantier.adresse.rue}</p>
                <p className="text-sm font-black text-gray-900">{chantier.adresse.codePostal} {chantier.adresse.ville}</p>
                <p className="text-xs font-medium text-gray-400">{chantier.adresse.pays}</p>
              </div>
              
              {chantier.adresse.latitude && chantier.adresse.longitude && (
                 <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${chantier.adresse.latitude},${chantier.adresse.longitude}`}
                  target="_blank"
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                 >
                    Google Maps <ArrowLeft size={12} className="rotate-180" />
                 </a>
              )}
            </div>

            {/* 6. Bloc Météo (Mobile: 6th) */}
            <div className="order-6 lg:order-none bg-white border border-gray-200 rounded-2xl p-6 lg:mb-6">
               <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Météo</h3>
                    <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">
                      {currentMeteo ? 'Temps Réel' : 'Prévue'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-5xl">
                      {getWeatherIcon(currentMeteo ? currentMeteo.weather_code : (scheduledMeteo?.code ?? 0))}
                    </div>
                    <div>
                      <p className="text-3xl font-black text-gray-900 tabular-nums">
                        {Math.round(currentMeteo ? currentMeteo.temperature_2m : (scheduledMeteo?.max ?? 0))}°C
                      </p>
                      <p className="text-[11px] text-gray-500 uppercase font-bold tracking-tight">
                        {currentMeteo ? 'Actuellement' : 'Maximum prévu'}
                      </p>
                    </div>
                  </div>
               </div>

               <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                     <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Wind size={12} />
                        <span className="text-[10px] font-bold uppercase">Vent</span>
                     </div>
                     <p className="text-sm font-black text-gray-700">{currentMeteo?.wind_speed_10m || '--'} <span className="text-[10px] font-medium uppercase italic">km/h</span></p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                     <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Droplets size={12} />
                        <span className="text-[10px] font-bold uppercase">Pluie</span>
                     </div>
                     <p className="text-sm font-black text-gray-700">{currentMeteo?.precipitation || '0'} <span className="text-[10px] font-medium uppercase italic">mm</span></p>
                  </div>
               </div>

               {/* Prévisions à venir */}
               {forecastDays.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Prochains jours</h4>
                    <div className="space-y-3">
                      {forecastDays.map((f: any, idx: number) => {
                        const isFavor = checkWeatherFavorability(f.tempMax, f.precipitationSum, f.windSpeedMax, f.weatherCode)
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{getWeatherIcon(f.weatherCode)}</span>
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  {new Date(f.date).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric' })}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isFavor.isFavorable ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  <p className="text-[9px] font-bold uppercase text-gray-400">{isFavor.isFavorable ? 'Favorable' : 'Difficile'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-black text-gray-900">{Math.round(f.tempMax)}°</p>
                               <p className="text-[9px] font-medium text-gray-400">{Math.round(f.tempMin)}°</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                 </div>
               )}
            </div>

            {/* 7. Statistiques rapides (Total Heures) (Mobile: 7th) */}
            <div className="order-7 lg:order-none bg-gray-900 rounded-2xl p-6 text-white lg:mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock size={16} className="text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Total Heures</h3>
              </div>
              <p className="text-4xl font-black tabular-nums">{totalHeures.toFixed(1).replace('.', ',')}h</p>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Consommées sur ce projet</p>
            </div>

          </div>
        </div>

      </main>
    </AppLayout>
  )
}
