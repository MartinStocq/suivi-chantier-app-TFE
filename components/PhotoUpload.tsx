'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, ChevronDown } from 'lucide-react'
import { uploadPhoto } from '@/lib/storage'
import { addPhotoAction } from '@/app/actions/photo'

interface PhotoUploadProps {
  chantierId: string
  takenById: string
  type?: 'AVANT' | 'APRES'
}

export default function PhotoUpload({ chantierId, takenById, type: forcedType }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [internalType, setInternalType] = useState<'AVANT' | 'APRES'>('AVANT')
  const [open, setOpen] = useState(false)

  const activeType = forcedType ?? internalType

  function selectType(t: 'AVANT' | 'APRES') {
    setInternalType(t)
    setOpen(false)
    // on déclenche l'input seulement après que le state est à jour
    setTimeout(() => {
      inputRef.current?.click()
    }, 50)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const storagePath = await uploadPhoto(file, chantierId)
          await addPhotoAction({ chantierId, takenById, type: activeType, storagePath })
        }
      } catch (e: any) {
        setError(e.message ?? "Erreur lors de l'envoi")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="relative">
        {/* Bouton principal */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (forcedType) {
              inputRef.current?.click()
            } else {
              setOpen((v) => !v)
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200
                     rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50
                     transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          {isPending ? 'Envoi…' : '+ Ajouter'}
          {!forcedType && <ChevronDown size={11} className="text-gray-400" />}
        </button>

        {/* Dropdown Avant / Après — affiché seulement si pas de type forcé */}
        {!forcedType && open && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 overflow-hidden min-w-[100px]">
            <button
              type="button"
              onClick={() => selectType('AVANT')}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition font-medium"
            >
               Avant
            </button>
            <button
              type="button"
              onClick={() => selectType('APRES')}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition border-t border-gray-100 font-medium"
            >
               Après
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
