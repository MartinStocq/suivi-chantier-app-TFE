'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePointageAction } from '@/app/actions/pointage'

interface DeletePointageButtonProps {
  pointageId: string
}

export default function DeletePointageButton({ pointageId }: DeletePointageButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deletePointageAction(pointageId)
      } catch (error: any) {
        alert(error.message || "Erreur lors de la suppression")
        setShowConfirm(false)
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-[10px] font-bold text-red-600 hover:text-red-700 underline"
        >
          {isPending ? "Suppression..." : "Confirmer"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="text-[10px] font-medium text-gray-400 hover:text-gray-600"
        >
          Annuler
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      title="Supprimer ce pointage"
    >
      <Trash2 size={14} />
    </button>
  )
}
