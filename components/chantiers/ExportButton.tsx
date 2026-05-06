'use client'

import { useState } from 'react'
import { FileDown, FileText, Table, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  chantierId: string
}

export default function ExportButton({ chantierId }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleExport = async (format: 'pdf' | 'csv') => {
    setLoading(format)
    setIsOpen(false)
    
    try {
      // On utilise window.location pour déclencher le téléchargement du navigateur
      window.location.href = `/api/chantiers/${chantierId}/export?format=${format}`
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      alert('Une erreur est survenue lors de la génération du fichier.')
    } finally {
      // On remet le loading à null après un court délai car window.location n'est pas "awaitable"
      setTimeout(() => setLoading(null), 2000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 
                   rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FileDown size={12} />
        )}
        Exporter
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <FileText size={14} className="text-red-500" />
              Format PDF (.pdf)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <Table size={14} className="text-emerald-500" />
              Format Excel (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
