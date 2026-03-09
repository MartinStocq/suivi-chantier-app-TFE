'use client'
import { useState } from 'react'
import { uploadPhoto } from '@/lib/storage'

interface Props {
  chantierId: string
  takenById: string
  type?: 'AVANT' | 'APRES'
  onUpload?: (storagePath: string) => void
}

export default function PhotoUpload({ chantierId, takenById, type = 'AVANT', onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setSuccess(false)

    try {
      const storagePath = await uploadPhoto(file, chantierId)

      await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, type, chantierId, takenById })
      })

      setSuccess(true)
      onUpload?.(storagePath)
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} />
      {uploading && <p>Upload en cours...</p>}
      {success && <p style={{ color: 'green' }}>✅ Photo uploadée avec succès !</p>}
      {preview && <img src={preview} alt="preview" width={200} />}
    </div>
  )
}
