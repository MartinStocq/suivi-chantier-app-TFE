'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function MeteoSyncButton({ label }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setLoading(true)
    try {
      await fetch('/api/meteo/sync')
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (label) {
    return (
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-50 transition shadow-sm"
      >
        <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
        {loading ? "Recherche..." : label}
      </button>
    )
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
      title="Actualiser la météo"
    >
      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
    </button>
  )
}
