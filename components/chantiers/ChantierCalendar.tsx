'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

type ChantierItem = {
  id: string
  titre: string
  statut: string
  dateDebutPrevue: string
  dateFinPrevue?: string | null
  client?: { nom: string } | null
  forecast?: {
    date: string
    weatherCode: number
    tempMax: number
    tempMin: number
  }[] | null
}

type Props = {
  chantiers: ChantierItem[]
  isChef?: boolean
}

const S: Record<string, { pill: string; dot: string; label: string }> = {
  EN_ATTENTE: { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',    label: 'En attente' },
  EN_COURS:   { pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',     label: 'En cours'   },
  TERMINE:   { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500',  label: 'Terminé'    },
  SUSPENDU:  { pill: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400',      label: 'Suspendu'   },
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return '☀️'
  if (code === 1) return '🌤️'
  if (code === 2) return '⛅'
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

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS  = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function isActive(day: Date, startISO: string, endISO?: string | null) {
  const start = new Date(startISO)
  const end   = endISO ? new Date(endISO) : new Date(startISO)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return day >= start && day <= end
}

export default function ChantierCalendar({ chantiers, isChef }: Props) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Calcul de la grille
  const firstDay    = new Date(year, month, 1)
  const lastDay     = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7

  const cells = Array.from<null, Date | null>({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1
    return d >= 1 && d <= lastDay.getDate() ? new Date(year, month, d) : null
  })

  const prev = () =>
    month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const next = () =>
    month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)

  const getDayForecast = (chantier: ChantierItem, day: Date) => {
    if (!chantier.forecast || !Array.isArray(chantier.forecast)) return null
    
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const dayData = chantier.forecast.find((f: any) => f.date === dateStr)
    if (!dayData) return null

    return {
      code: dayData.weatherCode,
      max: dayData.tempMax,
      min: dayData.tempMin,
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-900 w-40 text-center select-none">
            {MOIS[month]} {year}
          </span>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500
                       hover:bg-gray-50 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          {isChef && (
            <Link
              href="/chantiers/new"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                         bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <Plus size={12} />
              Nouveau
            </Link>
          )}
        </div>
      </div>

      {/* ── Entêtes jours ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {JOURS.map((j, i) => (
          <div
            key={j}
            className={`py-2 text-center text-xs font-medium uppercase tracking-wider
                        ${i >= 5 ? 'text-gray-300' : 'text-gray-400'}`}
          >
            {j}
          </div>
        ))}
      </div>

      {/* ── Grille ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday   = day ? sameDay(day, today) : false
          const isWeekend = i % 7 >= 5
          const isLastCol = i % 7 === 6
          const items     = day
            ? chantiers.filter(c => isActive(day, c.dateDebutPrevue, c.dateFinPrevue))
            : []

          return (
            <div
              key={i}
              className={[
                'min-h-[90px] border-b border-r border-gray-100 p-1.5 transition-colors',
                !day           ? 'bg-gray-50/80'    : '',
                isWeekend && day ? 'bg-gray-50/50'  : 'bg-white',
                isLastCol      ? 'border-r-0'       : '',
              ].join(' ')}
            >
              {day && (
                <>
                  {/* Numéro du jour */}
                  <div className="flex justify-end mb-1">
                    <span className={[
                      'w-6 h-6 flex items-center justify-center rounded-full',
                      'text-xs transition-colors select-none',
                      isToday
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'text-gray-400 font-normal hover:bg-gray-100 cursor-default',
                    ].join(' ')}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Badges chantiers */}
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map(c => {
                      const style = S[c.statut] ?? S.EN_ATTENTE
                      const dayForecast = getDayForecast(c, day)
                      
                      const startOfToday = new Date();
                      startOfToday.setHours(0,0,0,0);
                      const showWeather = dayForecast && day.getTime() >= startOfToday.getTime();

                      return (
                        <Link
                          key={c.id}
                          href={`/chantiers/${c.id}`}
                          title={`${c.titre}${c.client ? ' — ' + c.client.nom : ''}${showWeather ? ' (' + Math.round(dayForecast.max) + '°C)' : ''}`}
                          className={[
                            'flex items-center gap-1 px-1.5 py-0.5 rounded border',
                            'text-[10px] truncate hover:opacity-70 transition-opacity',
                            style.pill,
                          ].join(' ')}
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${style.dot}`} />
                          {showWeather && (
                            <span className="shrink-0">{getWeatherIcon(dayForecast.code)}</span>
                          )}
                          <span className="truncate leading-none">{c.titre}</span>
                        </Link>
                      )
                    })}
                    {items.length > 3 && (
                      <p className="text-[10px] text-gray-400 px-1">+{items.length - 3} autres</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Légende ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
        {Object.entries(S).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}