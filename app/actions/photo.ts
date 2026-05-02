'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { TypePhoto } from '@prisma/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface AddPhotoInput {
  chantierId: string
  takenById: string
  type: 'AVANT' | 'APRES'
  storagePath: string
  commentaire?: string
}

export async function addPhotoAction(data: AddPhotoInput) {
  await prisma.photo.create({
    data: {
      chantierId:  data.chantierId,
      takenById:   data.takenById,
      type:        data.type as TypePhoto,
      storagePath: data.storagePath,
      commentaire: data.commentaire ?? null,
    },
  })

  revalidatePath(`/chantiers/${data.chantierId}`)
  revalidatePath(`/chantiers/${data.chantierId}/photos`)
}

export async function deletePhotoAction(photoId: string, chantierId: string) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo) return

  // Supprime dans Supabase Storage
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  await supabase.storage.from('photos').remove([photo.storagePath])

  // Supprime en base
  await prisma.photo.delete({ where: { id: photoId } })

  revalidatePath(`/chantiers/${chantierId}`)
  revalidatePath(`/chantiers/${chantierId}/photos`)
}   