'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function updateProfilAction(data: {
  nom: string
  telephone: string
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Non authentifié')

  const cleanNom = data.nom.trim()
  if (cleanNom.length === 0) throw new Error('Le nom est requis')
  if (cleanNom.length > 100) throw new Error('Le nom est trop long (max 100 caractères)')

  const cleanTel = data.telephone.trim()
  if (cleanTel && !/^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}?\)?[\s-]?\d{1,4}[\s-]?\d{1,9}$/.test(cleanTel)) {
    throw new Error('Format de téléphone invalide')
  }

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      nom:       cleanNom,
      telephone: cleanTel || null,
    },
  })

  revalidatePath('/parametres')
  revalidatePath('/utilisateurs')
  revalidatePath('/dashboard')
  revalidatePath('/chantiers')
  revalidatePath('/', 'layout')
}

export async function updateAvatarAction(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Non authentifié')

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) throw new Error('Aucun fichier')

  // Validation de l'extension
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowedExts.includes(ext)) {
    throw new Error('Format de fichier non supporté (JPG, PNG, WEBP uniquement)')
  }

  // Validation de la taille (max 2MB par sécurité)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Le fichier est trop volumineux (max 2 Mo)')
  }

  const path = `avatars/${user.id}.${ext}`

  const supabase = getSupabaseAdmin()

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  await prisma.utilisateur.update({
    where: { id: user.id },
    data:  { avatarPath: path },
  })

  revalidatePath('/parametres')
  revalidatePath('/', 'layout')
}

