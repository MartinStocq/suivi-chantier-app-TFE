'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { addPointageAction, getUserBusyDatesAction } from '@/app/actions/pointage'
import { Clock, Loader2, CheckCircle2, User, Activity, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

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

  // Charger les dates occupées et initialiser la première date libre
  useEffect(() => {
    const userId = isChef && targetUserId ? targetUserId : currentUserId
    if (userId) {
      getUserBusyDatesAction(userId).then(dates => {
        setBusyDates(dates)
        const todayStr = new Date().toISOString().split('T')[0]
        if (!startDate) {
          if (dates.includes(todayStr)) {
            let d = new Date()
            while (dates.includes(d.toISOString().split('T')[0])) {
              d.setDate(d.getDate() + 1)
            }
            setStartDate(d.toISOString().split('T')[0])
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
    const dateStr = d.toISOString().split('T')[0]
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
        if (busyDates.includes(cur.toISOString().split('T')[0])) hasBusy = true
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

  const isSelected = (d: Date) => d.toISOString().split('T')[0] === startDate
  const isSelectedEnd = (d: Date) => endDate && d.toISOString().split('T')[0] === endDate
  const isInRange = (d: Date) => {
    const dateStr = d.toISOString().split('T')[0]
    if (endDate) return dateStr > startDate && dateStr < endDate
    if (hoverDate && isAbsence && startDate && !endDate) {
       return (dateStr > startDate && dateStr <= hoverDate) || (dateStr < startDate && dateStr >= hoverDate)
    }
    return false
  }

  const typeStyles: Record<string, string> = {
    TRAVAIL: 'bg-blue-600 text-white shadow-blue-200',
    MALADIE: 'bg-amber-500 text-white shadow-amber-200',
    CONGE_PAYE: 'bg-emerald-500 text-white shadow-emerald-200',
    INTEMPERIE: 'bg-red-500 text-white shadow-red-200',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Formulaire */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 leading-none">Pointage d&apos;activité</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
              {isChef ? 'Gestion administrative' : 'Enregistrement de terrain'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* 1. TYPE & COLLABORATEUR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">
              1. Choisir le type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'TRAVAIL', label: 'Travail', emoji: '💼' },
                { id: 'MALADIE', label: 'Maladie', emoji: '🤒' },
                { id: 'CONGE_PAYE', label: 'Congé', emoji: '🏖️' },
                { id: 'INTEMPERIE', label: 'Météo', emoji: '⛈️' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedType(t.id); setEndDate(null); }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all active:scale-95
                    ${selectedType === t.id 
                      ? `${typeStyles[t.id]} border-transparent shadow-lg` 
                      : 'bg-gray-50 border-gray-50 text-gray-500 hover:border-gray-200 hover:bg-white'}`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-[10px] font-black uppercase">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            {isChef && ouvriers && (
              <>
                <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">
                  2. Collaborateur
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => { setTargetUserId(e.target.value); setStartDate(''); setEndDate(null); }}
                  className="w-full h-[76px] px-4 bg-gray-50 border-2 border-gray-50 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none"
                >
                  <option value={currentUserId}>Moi-même</option>
                  {ouvriers.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                </select>
              </>
            )}
          </div>
        </div>

        {/* 2. CALENDRIER */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">
              3. Sélectionner la date {isAbsence && 'ou période'}
            </label>
            <div className="flex items-center gap-4 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
               <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/><span className="text-[9px] font-bold text-gray-500 uppercase">Libre</span></div>
               <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400"/><span className="text-[9px] font-bold text-gray-500 uppercase">Pris</span></div>
            </div>
          </div>
          
          <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/30">
              <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                {currentMonth.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-gray-100 transition-all"><ChevronLeft size={16}/></button>
                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-gray-100 transition-all"><ChevronRight size={16}/></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7">
              {['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map(d => (
                <div key={d} className="py-3 text-center text-[9px] font-black text-gray-300 border-b border-gray-50">{d}</div>
              ))}
              {daysInMonth(currentMonth).map((d, i) => {
                if (!d) return <div key={i} className="aspect-square bg-gray-50/30" />
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
                    className={`relative aspect-square flex items-center justify-center text-xs font-bold transition-all border-[0.5px] border-gray-100
                      ${isBusy 
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                        : (start || end)
                          ? 'bg-blue-600 text-white z-20 shadow-md rounded-xl scale-110'
                          : range
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:z-10'
                      }
                    `}
                  >
                    <span className="relative z-10">{d.getDate()}</span>
                    
                    {/* Indicateurs d'état */}
                    {isBusy && (
                      <span className="absolute bottom-2 w-1 h-1 bg-red-400 rounded-full" />
                    )}
                    {!isBusy && !start && !end && !range && (
                       <span className="absolute top-2 right-2 w-1 h-1 bg-emerald-400 rounded-full opacity-50" />
                    )}
                    
                    {/* Effet de sélection de période (continuité) */}
                    {range && (
                      <div className="absolute inset-0 bg-blue-500/10" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Résumé de la sélection */}
          <div className="mt-4 flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
             <div className="flex-1">
                <p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1.5">Début</p>
                <p className="text-sm font-black text-blue-900">{startDate ? new Date(startDate).toLocaleDateString('fr-BE') : 'Choisir...'}</p>
             </div>
             {isAbsence && (
               <>
                 <ArrowRight size={16} className="text-blue-300" />
                 <div className="flex-1">
                    <p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1.5">Fin (inclus)</p>
                    <p className="text-sm font-black text-blue-900">{endDate ? new Date(endDate).toLocaleDateString('fr-BE') : 'Cliquer une fin...'}</p>
                 </div>
               </>
             )}
          </div>
        </div>

        {/* 3. DETAILS CHANTIER & HEURES */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-gray-50">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">
              4. Chantier {isAbsence ? '(Optionnel)' : '(Requis)'}
            </label>
            <select
              id="chantierId"
              name="chantierId"
              required={!isAbsence}
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-50 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
            >
              <option value="">{isAbsence ? 'Indépendant d\'un chantier' : 'Sélectionner un chantier...'}</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">Début</label>
              <input type="time" name="debut" defaultValue="08:00" required className="w-full h-12 px-3 bg-gray-50 border-2 border-gray-50 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">Fin</label>
              <input type="time" name="fin" defaultValue="16:30" required className="w-full h-12 px-3 bg-gray-50 border-2 border-gray-50 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Commentaire */}
        <div className="pt-2">
          <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest">Observations</label>
          <textarea
            id="commentaire"
            name="commentaire"
            rows={2}
            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-sm font-medium text-black focus:outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
            placeholder="Ex: Cassé jambe, rendez-vous médical, travaux particuliers..."
          />
        </div>

        {/* MESSAGES & ACTION */}
        <div className="space-y-4 pt-4">
          {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 flex items-center gap-3 animate-shake">⚠️ {error}</div>}
          {success && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-600 flex items-center gap-3">✅ Enregistrement effectué avec succès !</div>}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3
              ${isPending ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'}`}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Valider le pointage'}
          </button>
        </div>
      </form>
    </div>
  )
}
