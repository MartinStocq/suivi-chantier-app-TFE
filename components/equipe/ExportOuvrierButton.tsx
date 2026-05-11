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
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const handleExport = async () => {
    setLoading(true)
    setIsOpen(false)
    
    try {
      window.location.href = `/api/users/${userId}/export?month=${currentMonth}&year=${currentYear}`
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
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Choisir la période</p>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <FileText size={16} className="text-red-500" />
              <div className="text-left">
                <p className="font-bold">Mois en cours</p>
                <p className="text-[10px] text-gray-400 capitalize">
                  {now.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
