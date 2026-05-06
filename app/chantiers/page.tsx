import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { autoUpdateChantierStatuts } from '@/lib/chantiers'
import { autoUpdateMeteo } from '@/lib/meteo'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ChantierCalendar from '@/components/chantiers/ChantierCalendar'
import { getForecast } from '@/lib/meteo'
import { Calendar } from 'lucide-react'

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
    if (c.adresse.latitude && c.adresse.longitude) {
      forecast = await getForecast(c.adresse.latitude, c.adresse.longitude)
    }
    return {
      id:              c.id,
      titre:           c.titre,
      statut:          c.statut as string,
      dateDebutPrevue: c.dateDebutPrevue.toISOString(),
      dateFinPrevue:   c.dateFinPrevue?.toISOString() ?? null,
      client:          c.client ? { nom: c.client.nom } : null,
      forecast:        forecast
    }
  }))

  return (
    <AppLayout>
      <TopBar
        title="Chantiers"
        subtitle={`${chantiers.length} chantier${chantiers.length > 1 ? 's' : ''}`}
      />
      <main className="flex-1 px-8 py-8 space-y-6">

        {/* Chantiers en cours */}
        {enCours.length > 0 && (
          <div className="space-y-2">
            {enCours.map(c => {
              const chantierData = chantiersWithForecast.find(cf => cf.id === c.id);
              const forecast = chantierData?.forecast;
              
              // On cherche la météo pour le jour du début
              const d = new Date(c.dateDebutPrevue);
              const dateDebutStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const dayForecast = (forecast as any[])?.find((f: any) => f.date === dateDebutStr);
              
              const weatherCode = dayForecast?.weatherCode ?? null;
              const tempMax = dayForecast?.tempMax ?? null;

              // On ne montre la météo que si le chantier commence aujourd'hui ou après
              const startOfToday = new Date();
              startOfToday.setHours(0,0,0,0);
              const showWeather = weatherCode !== null && weatherCode !== undefined && new Date(c.dateDebutPrevue).getTime() >= startOfToday.getTime();

              return (
                <Link key={c.id} href={`/chantiers/${c.id}`}>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between hover:bg-blue-100 transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      {showWeather && (
                        <div className="flex flex-col items-center justify-center bg-white/50 w-12 h-12 rounded-lg border border-blue-100" title="Météo prévue au démarrage">
                          <span className="text-xl leading-none">
                            {weatherCode === 0 ? '☀️' :
                             weatherCode <= 3 ? '🌤️' :
                             weatherCode <= 48 ? '☁️' :
                             weatherCode <= 67 ? '🌧️' :
                             weatherCode <= 77 ? '❄️' :
                             weatherCode <= 82 ? '🌦️' :
                             weatherCode <= 86 ? '🌨️' :
                             weatherCode <= 99 ? '⛈️' : '🌡️'}
                          </span>
                          {tempMax !== null && (
                            <span className="text-[10px] font-bold text-blue-700 mt-1">{Math.round(tempMax)}°</span>
                          )}
                        </div>
                      )}
                      {!showWeather && (
                        <div className="w-12 h-12 rounded-lg bg-blue-100/50 flex items-center justify-center border border-blue-100/20">
                           <Calendar size={18} className="text-blue-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-blue-400 mb-0.5 font-medium uppercase tracking-wider">En cours</p>
                        <p className="text-sm font-semibold text-blue-900">{c.titre}</p>
                        {c.client && (
                          <p className="text-xs text-blue-400 mt-0.5">{c.client.nom}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-500 tabular-nums">
                        {new Date(c.dateDebutPrevue).toLocaleDateString('fr-BE', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                      <p className="text-[10px] text-blue-300 mt-1">{c.adresse.ville}</p>
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