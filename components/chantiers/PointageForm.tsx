'use client'

import { useState, useTransition, useEffect } from 'react'
import { addPointageAction, getUserBusyDatesAction } from '@/app/actions/pointage'
import { 
  Clock, 
  Loader2, 
  User, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Briefcase,
  Stethoscope,
  Palmtree,
  CloudRain,
  Info
} from 'lucide-react'

interface Chantier {
  id: string
  titre: string
  dateDebutPrevue: string | Date
  dateFinPrevue?: string | Date | null
}

interface UserSummary {
  id: string
  nom: string
}

interface PointageFormProps {
  chantiers: Chantier[]
  currentUserRole?: string
  ouvriers?: UserSummary[]
  currentUserId?: string
}

export default function PointageForm({ chantiers, currentUserRole, ouvriers, currentUserId }: PointageFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedChantierId, setSelectedChantierId] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('TRAVAIL')
  const [targetUserId, setTargetUserId] = useState<string>(currentUserId || '')
  
  // Calendrier
  const [busyDates, setBusyDates] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const isChef = currentUserRole === 'CHEF_CHANTIER'
  const isAbsence = selectedType !== 'TRAVAIL'

  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Charger les dates occupées et initialiser la première date libre
  useEffect(() => {
    const userId = isChef && targetUserId ? targetUserId : currentUserId
    if (userId) {
      getUserBusyDatesAction(userId).then(dates => {
        setBusyDates(dates)
        const todayStr = formatDate(new Date())
        if (!startDate) {
          if (dates.includes(todayStr)) {
            let d = new Date()
            while (dates.includes(formatDate(d))) {
              d.setDate(d.getDate() + 1)
            }
            setStartDate(formatDate(d))
          } else {
            setStartDate(todayStr)
          }
        }
      })
    }
  }, [targetUserId, currentUserId, isChef, startDate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const data = {
      chantierId: formData.get('chantierId') as string,
      utilisateurId: targetUserId || undefined,
      type: selectedType as any,
      date: startDate,
      dateFinRange: isAbsence ? (endDate || startDate) : undefined,
      debut: formData.get('debut') as string,
      fin: formData.get('fin') as string,
      commentaire: formData.get('commentaire') as string,
    }

    if ((selectedType === 'TRAVAIL' && !data.chantierId) || !data.date || !data.debut || !data.fin) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    startTransition(async () => {
      try {
        await addPointageAction(data)
        setSuccess(true)
        setSelectedChantierId('')
        
        // Rafraîchir les dates occupées
        const userId = isChef && targetUserId ? targetUserId : currentUserId
        if (userId) {
          const newBusy = await getUserBusyDatesAction(userId)
          setBusyDates(newBusy)
        }
        
        setEndDate(null)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err: any) {
        setError(err.message || "Une erreur est survenue")
      }
    })
  }

  // --- LOGIQUE CALENDRIER ---
  const daysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    const startOffset = (firstDay.getDay() + 6) % 7
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }

  const handleDateClick = (d: Date) => {
    const dateStr = formatDate(d)
    if (busyDates.includes(dateStr)) return

    if (!isAbsence) {
      setStartDate(dateStr)
      setEndDate(null)
      return
    }

    // Logique de période
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr)
      setEndDate(null)
    } else if (dateStr < startDate) {
      setStartDate(dateStr)
    } else if (dateStr === startDate) {
      setStartDate(dateStr)
      setEndDate(null)
    } else {
      // Vérifier si un jour entre start et click est occupé
      const start = new Date(startDate)
      let cur = new Date(start)
      let hasBusy = false
      while (cur <= d) {
        if (busyDates.includes(formatDate(cur))) hasBusy = true
        cur.setDate(cur.getDate() + 1)
      }

      if (hasBusy) {
        setError("La période sélectionnée contient des jours déjà occupés.")
        setStartDate(dateStr)
        setEndDate(null)
      } else {
        setEndDate(dateStr)
        setError(null)
      }
    }
  }

  const isSelected = (d: Date) => formatDate(d) === startDate
  const isSelectedEnd = (d: Date) => endDate && formatDate(d) === endDate
  const isInRange = (d: Date) => {
    const dateStr = formatDate(d)
    if (endDate) return dateStr > startDate && dateStr < endDate
    if (hoverDate && isAbsence && startDate && !endDate) {
       return (dateStr > startDate && dateStr <= hoverDate) || (dateStr < startDate && dateStr >= hoverDate)
    }
    return false
  }

  const types = [
    { id: 'TRAVAIL', label: 'Travail', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'MALADIE', label: 'Maladie', icon: Stethoscope, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { id: 'CONGE_PAYE', label: 'Congé', icon: Palmtree, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'INTEMPERIE', label: 'Intempérie', icon: CloudRain, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header Formulaire */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-gray-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Enregistrer une activité</h2>
            <p className="text-[10px] text-gray-500 font-medium">
              {isChef ? 'Mode administrateur' : 'Saisie quotidienne'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:px-6 md:py-6 space-y-6">
        {/* TYPE & COLLABORATEUR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-700">Type d&apos;activité</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {types.map(t => {
                const Icon = t.icon
                const isActive = selectedType === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedType(t.id); setEndDate(null); }}
                    className={`flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-lg border text-[11px] md:text-sm transition-all
                      ${isActive 
                        ? `${t.bg} ${t.border} ${t.color} font-semibold ring-1 ring-offset-0 ring-current/20` 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {isChef && ouvriers && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-700">Collaborateur</label>
              <div className="relative">
                <select
                  value={targetUserId}
                  onChange={(e) => { setTargetUserId(e.target.value); setStartDate(''); setEndDate(null); }}
                  className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value={currentUserId}>Moi-même</option>
                  {ouvriers.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                </select>
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* CALENDRIER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              Date ou période sélectionnée
            </label>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-gray-200 bg-white"/><span className="text-[10px] text-gray-500">Libre</span></div>
               <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-100 border border-red-200"/><span className="text-[10px] text-gray-500">Déjà pointé</span></div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/30">
              <p className="text-xs font-bold text-gray-900">
                {currentMonth.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16}/></button>
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7">
              {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-medium text-gray-400 border-b border-gray-50">{d}</div>
              ))}
              {daysInMonth(currentMonth).map((d, i) => {
                if (!d) return <div key={i} className="aspect-square bg-gray-50/20" />
                const dateStr = d.toISOString().split('T')[0]
                const isBusy = busyDates.includes(dateStr)
                const start = isSelected(d)
                const end = isSelectedEnd(d)
                const range = isInRange(d)
                
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isBusy}
                    onMouseEnter={() => setHoverDate(dateStr)}
                    onMouseLeave={() => setHoverDate(null)}
                    onClick={() => handleDateClick(d)}
                    className={`relative aspect-square flex items-center justify-center text-xs transition-all
                      ${isBusy 
                        ? 'bg-red-50/30 text-gray-300 cursor-not-allowed' 
                        : (start || end)
                          ? 'bg-blue-600 text-white font-bold z-10 shadow-sm rounded-lg scale-95'
                          : range
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                      }
                      ${!isBusy && !start && !end && !range ? 'border-[0.5px] border-gray-100' : ''}
                    `}
                  >
                    <span>{d.getDate()}</span>
                    {isBusy && <div className="absolute top-1 right-1 w-1 h-1 bg-red-300 rounded-full" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Résumé de la sélection */}
          <div className="flex items-center gap-3 p-3 bg-blue-50/30 border border-blue-100/50 rounded-lg">
             <CalendarIcon size={16} className="text-blue-500 shrink-0" />
             <div className="flex-1 flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-900">{startDate ? new Date(startDate).toLocaleDateString('fr-BE') : 'Sélectionnez une date'}</span>
                {isAbsence && endDate && (
                  <>
                    <ArrowRight size={14} className="text-blue-400" />
                    <span className="font-medium text-blue-900">{new Date(endDate).toLocaleDateString('fr-BE')}</span>
                  </>
                )}
             </div>
          </div>
        </div>

        {/* DETAILS CHANTIER & HEURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <label htmlFor="chantierId" className="text-xs font-semibold text-gray-700">Chantier</label>
            <select
              id="chantierId"
              name="chantierId"
              required={!isAbsence}
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">{isAbsence ? 'Hors chantier (optionnel)' : 'Sélectionner un chantier...'}</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label htmlFor="debut" className="text-xs font-semibold text-gray-700">Heure début</label>
              <input id="debut" type="time" name="debut" defaultValue="08:00" required className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="space-y-3">
              <label htmlFor="fin" className="text-xs font-semibold text-gray-700">Heure fin</label>
              <input id="fin" type="time" name="fin" defaultValue="16:30" required className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Commentaire */}
        <div className="space-y-3">
          <label htmlFor="commentaire" className="text-xs font-semibold text-gray-700">Observations</label>
          <textarea
            id="commentaire"
            name="commentaire"
            rows={2}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            placeholder="Détails complémentaires..."
          />
        </div>

        {/* MESSAGES & ACTION */}
        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
              <Info size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-700 flex items-center gap-2">
              <Info size={14} /> Enregistrement effectué avec succès !
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-3.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${isPending 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] shadow-sm'}`}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Valider le pointage'}
          </button>
        </div>
      </form>
    </div>
  )
}
