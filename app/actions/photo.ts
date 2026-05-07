'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { TypePhoto } from '@prisma/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface AddPhotoInput {
  chantierId:   string
  takenById:    string
  type:         'AVANT' | 'APRES'
  storagePath:  string
  commentaire?: string
}

export async function addPhotoAction(data: AddPhotoInput) {
  const me = await getCurrentUser()
  if (!me) throw new Error('Non authentifié')

  const chantier = await prisma.chantier.findUnique({ where: { id: data.chantierId } })
  if (!chantier) throw new Error('Chantier introuvable')

  // Un ouvrier ne peut pas ajouter de photo sur un chantier terminé
  if (me.role === 'OUVRIER' && chantier.statut === 'TERMINE') {
    throw new Error('Action impossible : le chantier est terminé')
  }

  // Un ouvrier ne peut uploader que pour lui-même
  if (me.role !== 'CHEF_CHANTIER' && me.id !== data.takenById) {
    throw new Error('Accès refusé')
  }

  // Un ouvrier doit être affecté au chantier
  if (me.role !== 'CHEF_CHANTIER') {
    const affectation = await prisma.affectationChantier.findFirst({
      where: { chantierId: data.chantierId, userId: me.id },
    })
    if (!affectation) throw new Error("Vous n'êtes pas affecté à ce chantier")
  }

  // Validation commentaire
  const cleanCommentaire = data.commentaire?.trim() || null
  if (cleanCommentaire && cleanCommentaire.length > 500) {
    throw new Error('Le commentaire est trop long (max 500 caractères)')
  }

  await prisma.photo.create({
    data: {
      chantierId:  data.chantierId,
      takenById:   data.takenById,
      type:        data.type as TypePhoto,
      storagePath: data.storagePath,
      commentaire: cleanCommentaire,
    },
  })

  await prisma.actionJournal.create({
    data: {
      action: 'AJOUT_PHOTO',
      chantierId: data.chantierId,
      auteurId: me.id,
      details: `Ajout d'une photo ${data.type}`,
    }
  })

  revalidatePath(`/chantiers/${data.chantierId}`)
  revalidatePath(`/chantiers/${data.chantierId}/photos`)
}

export async function deletePhotoAction(photoId: string, chantierId: string) {
  const me = await getCurrentUser()
  if (!me) throw new Error('Non authentifié')

  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo) return

  const chantier = await prisma.chantier.findUnique({ where: { id: chantierId } })
  if (!chantier) throw new Error('Chantier introuvable')

  // Un ouvrier ne peut pas supprimer de photo sur un chantier terminé
  if (me.role === 'OUVRIER' && chantier.statut === 'TERMINE') {
    throw new Error('Action impossible : le chantier est terminé')
  }

  // Un ouvrier ne peut supprimer que ses propres photos
  if (me.role !== 'CHEF_CHANTIER' && photo.takenById !== me.id) {
    throw new Error('Accès refusé')
  }

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

  await prisma.photo.delete({ where: { id: photoId } })

  revalidatePath(`/chantiers/${chantierId}`)
  revalidatePath(`/chantiers/${chantierId}/photos`)
}