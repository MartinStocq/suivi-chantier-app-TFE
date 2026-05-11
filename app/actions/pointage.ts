'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { TypePointage } from '@prisma/client'

interface AddPointageInput {
  chantierId: string
  date: string
  debut: string // HH:mm
  fin: string   // HH:mm
  type?: TypePointage
  utilisateurId?: string // Utilisé par le Chef pour pointer pour un ouvrier
  commentaire?: string
}

export async function addPointageAction(data: AddPointageInput) {
  const me = await getCurrentUser()
  if (!me) throw new Error('Non authentifié')

  const targetUserId = (me.role === 'CHEF_CHANTIER' && data.utilisateurId) 
    ? data.utilisateurId 
    : me.id

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

  // Vérifier si l'utilisateur cible est affecté au chantier (optionnel mais recommandé)
  // Sauf pour les congés/maladie qui pourraient ne pas être liés à un chantier spécifique ? 
  // Mais ici on demande un chantierId, donc on garde la logique.
  if (me.role === 'OUVRIER' || (me.role === 'CHEF_CHANTIER' && targetUserId !== me.id)) {
    const affectation = await prisma.affectationChantier.findFirst({
      where: {
        chantierId: data.chantierId,
        userId: targetUserId
      }
    })
    // Si c'est du travail normal, l'affectation est requise. 
    // Pour maladie/conge, on pourrait être plus souple, mais restons cohérents avec le modèle actuel.
    if (!affectation && (!data.type || data.type === 'TRAVAIL')) {
      throw new Error("L'utilisateur n'est pas affecté à ce chantier")
    }
  }

  const pointage = await prisma.pointage.create({
    data: {
      date: dateObj,
      type: data.type || 'TRAVAIL',
      debut: debutDateTime,
      fin: finDateTime,
      duree,
      commentaire: cleanCommentaire,
      chantierId: data.chantierId,
      utilisateurId: targetUserId
    },
    include: {
      chantier: { select: { titre: true } },
      utilisateur: { select: { nom: true } }
    }
  })

  // Création d'une entrée dans le journal
  const typeLabel = data.type ? data.type.toLowerCase().replace('_', ' ') : 'travail'
  await prisma.actionJournal.create({
    data: {
      action: 'POINTAGE',
      chantierId: data.chantierId,
      auteurId: me.id,
      details: `Pointage (${typeLabel}) de ${duree.toFixed(2).replace('.', ',')}h effectué pour ${pointage.utilisateur.nom} sur "${pointage.chantier.titre}"`,
    }
  })

  revalidatePath('/dashboard')
  revalidatePath(`/chantiers/${data.chantierId}`)
  revalidatePath('/journal')
  revalidatePath(`/utilisateurs/${targetUserId}/pointages`)
}
