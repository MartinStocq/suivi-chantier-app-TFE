'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePhotoAction } from '@/app/actions/photo'

interface Photo {
  id: string
  storagePath: string
  type: string
}

interface Props {
  photos: Photo[]
  totalPhotos: number
  chantierId: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`
}

function PhotoCard({ photo, chantierId }: { photo: Photo; chantierId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleDelete() {
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 3000)
      return
    }
    startTransition(async () => {
      await deletePhotoAction(photo.id, chantierId)
    })
  }

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(photo.storagePath)}
        alt={photo.type}
        className="w-full h-full object-cover"
      />

      {/* Badge type */}
      <span className="absolute bottom-1.5 left-1.5 text-xs px-1.5 py-0.5 bg-black/50 text-white rounded font-medium">
        {photo.type === 'AVANT' ? 'Avant' : 'Après'}
      </span>

      {/* Bouton supprimer */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={`absolute top-1.5 right-1.5 p-1.5 rounded-lg text-white text-xs font-medium
                    transition opacity-0 group-hover:opacity-100
                    ${confirm ? 'bg-red-500 opacity-100' : 'bg-black/50 hover:bg-red-500'}
                    disabled:opacity-50`}
        title={confirm ? 'Cliquer encore pour confirmer' : 'Supprimer'}
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      </button>

      {/* Tooltip confirmation */}
      {confirm && (
        <div className="absolute top-8 right-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded shadow z-10 whitespace-nowrap">
          Confirmer ?
        </div>
      )}
    </div>
  )
}

export default function ChantierPhotosGrid({ photos, totalPhotos, chantierId }: Props) {
  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-lg py-12 text-center">
        <p className="text-sm text-gray-400">Aucune photo pour ce chantier</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} chantierId={chantierId} />
      ))}
    </div>
  )
}
