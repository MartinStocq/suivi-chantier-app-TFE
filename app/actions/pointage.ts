'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface AddPointageInput {
  chantierId: string
  date: string
  debut: string // HH:mm
  fin: string   // HH:mm
  commentaire?: string
}

export async function addPointageAction(data: AddPointageInput) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Non authentifié')

  const dateObj = new Date(data.date)
  if (isNaN(dateObj.getTime())) {
    throw new Error('Date invalide')
  }
  
  // Créer des objets DateTime complets pour debut et fin
  const [hDebut, mDebut] = data.debut.split(':').map(Number)
  const [hFin, mFin] = data.fin.split(':').map(Number)

  const debutDateTime = new Date(dateObj)
  debutDateTime.setHours(hDebut, mDebut, 0, 0)

  const finDateTime = new Date(dateObj)
  finDateTime.setHours(hFin, mFin, 0, 0)

  if (finDateTime <= debutDateTime) {
    throw new Error("L'heure de fin doit être après l'heure de début")
  }

  // Calcul de la durée en heures
  const diffMs = finDateTime.getTime() - debutDateTime.getTime()
  const duree = diffMs / (1000 * 60 * 60)

  // Validation commentaire
  const cleanCommentaire = data.commentaire?.trim() || null
  if (cleanCommentaire && cleanCommentaire.length > 500) {
    throw new Error('Le commentaire est trop long (max 500 caractères)')
  }

  // Vérifier si l'utilisateur est affecté au chantier (optionnel mais recommandé)
  if (user.role === 'OUVRIER') {
    const affectation = await prisma.affectationChantier.findFirst({
      where: {
        chantierId: data.chantierId,
        userId: user.id
      }
    })
    if (!affectation) {
      throw new Error("Vous n'êtes pas affecté à ce chantier")
    }
  }

  const pointage = await prisma.pointage.create({
    data: {
      date: dateObj,
      debut: debutDateTime,
      fin: finDateTime,
      duree,
      commentaire: cleanCommentaire,
      chantierId: data.chantierId,
      utilisateurId: user.id
    },
    include: {
      chantier: { select: { titre: true } }
    }
  })

  // Création d'une entrée dans le journal
  await prisma.actionJournal.create({
    data: {
      action: 'POINTAGE',
      chantierId: data.chantierId,
      auteurId: user.id,
      details: `Pointage de ${duree.toFixed(2).replace('.', ',')}h effectué sur le chantier "${pointage.chantier.titre}"`,
    }
  })

  revalidatePath('/dashboard')
  revalidatePath(`/chantiers/${data.chantierId}`)
  revalidatePath('/journal')
}
