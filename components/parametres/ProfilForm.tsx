'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, Save, HardHat, Wrench } from 'lucide-react'
import { updateProfilAction, updateAvatarAction } from '@/app/actions/profil'

interface Props {
  nom: string
  email: string
  telephone: string
  role: string
  avatarUrl: string | null
  createdAt: string
}

export default function ProfilForm({ nom, email, telephone, role, avatarUrl, createdAt }: Props) {
  const [nomVal, setNomVal]           = useState(nom)
  const [telVal, setTelVal]           = useState(telephone)
  const [preview, setPreview]         = useState<string | null>(avatarUrl)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [isUploading, setUploading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      await updateAvatarAction(fd)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await updateProfilAction({ nom: nomVal, telephone: telVal })
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const initials = nomVal.charAt(0).toUpperCase()

  const inputClass = `
    w-full px-3 py-2.5 text-sm text-gray-900 bg-white
    border border-gray-200 rounded-lg
    placeholder:text-gray-400
    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
    transition
  `

  return (
    <div className="space-y-5">

      {/* Avatar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Photo de profil</h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {preview ? (
              <img
                src={preview}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-semibold select-none">
                {initials}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200
                         rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50
                         transition disabled:opacity-50"
            >
              <Camera size={12} />
              Changer la photo
            </button>
            <p className="text-xs text-gray-400 mt-1.5">JPG, PNG — max 5 Mo</p>
          </div>
        </div>
      </div>

      {/* Informations */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Informations personnelles</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nom complet</label>
          <input
            type="text"
            value={nomVal}
            onChange={e => setNomVal(e.target.value)}
            required
            placeholder="Ton nom"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Téléphone</label>
          <input
            type="tel"
            value={telVal}
            onChange={e => setTelVal(e.target.value)}
            placeholder="+32 470 00 00 00"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Rôle</label>
          <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${
            role === 'CHEF_CHANTIER'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            {role === 'CHEF_CHANTIER'
              ? <><HardHat size={11} /> Chef de chantier</>
              : <><Wrench size={11} /> Ouvrier</>
            }
          </div>
        </div>

        {error   && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600 font-medium">✓ Profil mis à jour</p>}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white
                     text-xs font-medium rounded-lg hover:bg-gray-700 transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {/* Compte */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Compte</h2>
        <p className="text-xs text-gray-400">
          Membre depuis le {new Date(createdAt).toLocaleDateString('fr-BE', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

    </div>
  )
}