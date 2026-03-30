'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ApprouverButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState<'approuver' | 'refuser' | null>(null)
  const router = useRouter()

  const handleAction = async (action: 'approuver' | 'refuser') => {
    setLoading(action)
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleAction('refuser')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 text-xs font-medium rounded-lg transition disabled:opacity-50"
      >
        {loading === 'refuser' ? <Loader2 size={12} className="animate-spin" /> : 'Refuser'}
      </button>
      <button
        onClick={() => handleAction('approuver')}
        disabled={loading !== null}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition"
      >
        {loading === 'approuver' ? <Loader2 size={12} className="animate-spin" /> : 'Approuver'}
      </button>
    </div>
  )
}