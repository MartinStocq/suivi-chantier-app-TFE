import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { autoUpdateChantierStatuts } from '@/lib/chantiers'
import { autoUpdateMeteo, getWeatherData } from '@/lib/meteo'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ChantierCalendar from '@/components/chantiers/ChantierCalendar'
import { getForecast } from '@/lib/meteo'
import { Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChantiersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Mise à jour automatique des statuts et de la météo
  await autoUpdateChantierStatuts()
  await autoUpdateMeteo()

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

  // Météo individualisée par chantier pour le calendrier
  const chantiersWithForecast = await Promise.all(chantiers.map(async (c) => {
    let forecast = null
    let currentWeather = null

    if (c.adresse.latitude && c.adresse.longitude) {
      // 1. On récupère le forecast pour le calendrier
      forecast = await getForecast(c.adresse.latitude, c.adresse.longitude)

      // 2. Si le chantier est en cours, on récupère la météo EN TEMPS RÉEL (maintenant)
      if (c.statut === 'EN_COURS') {
        currentWeather = await getWeatherData(c.adresse.latitude, c.adresse.longitude)
      }
    }

    return {
      id:              c.id,
      titre:           c.titre,
      statut:          c.statut as string,
      dateDebutPrevue: c.dateDebutPrevue.toISOString(),
      dateFinPrevue:   c.dateFinPrevue?.toISOString() ?? null,
      client:          c.client ? { nom: c.client.nom } : null,
      forecast:        forecast,
      currentWeather:  currentWeather
    }
  }))

  return (
    <AppLayout>
      <TopBar
        title="Chantiers"
        subtitle={`${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}`}
      />
      <main className="flex-1 px-4 md:px-8 py-6 md:py-8 space-y-6">

        {/* Chantiers en cours */}
        {enCours.length > 0 && (
          <div className="space-y-3">
            {enCours.map(c => {
              const chantierData = chantiersWithForecast.find(cf => cf.id === c.id);
              const cur = chantierData?.currentWeather;
              const forecast = chantierData?.forecast;

              const weatherCode = cur ? cur.weatherCode : null;
              const temp = cur ? cur.temperature : null;
              const isRealTime = cur !== null && cur !== undefined;

              // Détermination de l'icône (jour/nuit)
              const hour = new Date().getHours();
              const isNight = hour >= 22 || hour < 6;

              const getWeatherIcon = (code: number | null) => {
                if (code === null) return '🌡️';
                if (code === 0) return isNight ? '🌙' : '☀️';
                if (code === 1) return isNight ? '☁️' : '🌤️';
                if (code === 2) return isNight ? '☁️' : '⛅';
                if (code === 3) return '☁️';
                if (code <= 48) return '🌫️';
                if (code <= 55) return '🌦️';
                if (code <= 67) return '🌧️';
                if (code <= 77) return '❄️';
                if (code <= 82) return '🌧️';
                if (code <= 86) return '🌨️';
                if (code <= 99) return '⛈️';
                return '🌡️';
              };

              // Fallback si pas de temps réel : on cherche dans le forecast
              let displayWeatherCode = weatherCode;
              let displayTemp = temp;
              let tooltip = "Météo actuelle (temps réel)";

              if (!isRealTime) {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const dayForecast = (forecast as any[])?.find((f: any) => f.date === todayStr);
                displayWeatherCode = dayForecast?.weatherCode ?? null;
                displayTemp = dayForecast?.tempMax ?? null;
                tooltip = "Météo du jour (prévision)";
              }

              const showWeather = displayWeatherCode !== null && displayWeatherCode !== undefined;

              return (
                <Link key={c.id} href={`/chantiers/${c.id}`}>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-100 transition cursor-pointer gap-4">
                    <div className="flex items-center gap-4">
                      {showWeather && (
                        <div className="flex flex-col items-center justify-center bg-white/50 w-12 h-12 rounded-lg border border-blue-100 shrink-0" title={tooltip}>
                          <span className="text-xl leading-none">
                            {getWeatherIcon(displayWeatherCode)}
                          </span>
                          {displayTemp !== null && (
                            <span className="text-[10px] font-bold text-blue-700 mt-1">{Math.round(displayTemp)}°</span>
                          )}
                        </div>
                      )}
                      {!showWeather && (
                        <div className="w-12 h-12 rounded-lg bg-blue-100/50 flex items-center justify-center border border-blue-100/20 shrink-0">
                           <Calendar size={18} className="text-blue-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">En cours</p>
                            {isRealTime && <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Direct"></span>}
                        </div>
                        <p className="text-sm font-semibold text-blue-900 truncate">{c.titre}</p>
                        {c.client && (
                          <p className="text-xs text-blue-400 mt-0.5 truncate">{c.client.nom}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right border-t sm:border-t-0 border-blue-100 pt-3 sm:pt-0">
                      <p className="text-xs font-semibold text-blue-500 tabular-nums">
                        Aujourd&apos;hui, {new Date().toLocaleDateString('fr-BE', {
                          day: '2-digit', month: 'short'
                        })}
                      </p>
                      <p className="text-[10px] text-blue-400 mt-1">{c.adresse.ville}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <ChantierCalendar
          chantiers={chantiersWithForecast}
          isChef={isChef}
        />

      </main>
    </AppLayout>
  )
}