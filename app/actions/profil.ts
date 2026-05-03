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

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      nom:       data.nom.trim(),
      telephone: data.telephone.trim() || null,
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

  const ext  = file.name.split('.').pop()
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

