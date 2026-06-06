'use client'

import { useState } from 'react'
import { FileDown, FileText, Loader2 } from 'lucide-react'

interface ExportOuvrierButtonProps {
  userId: string
  nom: string
}

export default function ExportOuvrierButton({ userId, nom }: ExportOuvrierButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Par défaut on exporte le mois en cours
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ]

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  const handleExport = async () => {
    setLoading(true)
    setIsOpen(false)
    
    try {
      window.location.href = `/api/users/${userId}/export?month=${selectedMonth}&year=${selectedYear}`
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      alert('Une erreur est survenue lors de la génération du PDF.')
    } finally {
      setTimeout(() => setLoading(false), 2000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 
                   rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileDown size={14} className="text-blue-500" />
        )}
        Exporter Rapport Mensuel
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-4">
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Période d&apos;exportation</p>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition shadow-sm"
            >
              <FileText size={14} />
              Exporter en PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
