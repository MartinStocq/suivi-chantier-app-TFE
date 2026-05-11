'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { TypePointage } from '@prisma/client'

interface AddPointageInput {
  chantierId?: string // Optionnel pour les absences
  date: string
  dateFinRange?: string // Utilisé pour les absences multi-jours
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

  // Validation : le chantier est obligatoire uniquement pour le travail normal
  if ((!data.type || data.type === 'TRAVAIL') && !data.chantierId) {
    throw new Error('Un chantier est requis pour un pointage de travail')
  }

  const startDate = new Date(data.date)
  if (isNaN(startDate.getTime())) {
    throw new Error('Date invalide')
  }

  const endDate = data.dateFinRange ? new Date(data.dateFinRange) : startDate
  if (isNaN(endDate.getTime())) {
    throw new Error('Date de fin invalide')
  }

  if (endDate < startDate) {
    throw new Error("La date de fin doit être après la date de début")
  }

  // Calculer le nombre de jours entre start et end
  const days: Date[] = []
  let current = new Date(startDate)
  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Vérifier les heures pour un jour type
  const [hDebut, mDebut] = data.debut.split(':').map(Number)
  const [hFin, mFin] = data.fin.split(':').map(Number)

  if (hFin < hDebut || (hFin === hDebut && mFin <= mDebut)) {
    throw new Error("L'heure de fin doit être après l'heure de début")
  }

  // Validation commentaire
  const cleanCommentaire = data.commentaire?.trim() || null
  if (cleanCommentaire && cleanCommentaire.length > 500) {
    throw new Error('Le commentaire est trop long (max 500 caractères)')
  }

  // Vérifier l'affectation (seulement pour le travail normal sur un chantier)
  if (data.chantierId && (me.role === 'OUVRIER' || (me.role === 'CHEF_CHANTIER' && targetUserId !== me.id))) {
    const affectation = await prisma.affectationChantier.findFirst({
      where: {
        chantierId: data.chantierId,
        userId: targetUserId
      }
    })
    if (!affectation && (!data.type || data.type === 'TRAVAIL')) {
      throw new Error("L'utilisateur n'est pas affecté à ce chantier")
    }
  }

  // Création massive (un pointage par jour)
  const results = await Promise.all(days.map(async (dayDate) => {
    const debutDateTime = new Date(dayDate)
    debutDateTime.setHours(hDebut, mDebut, 0, 0)

    const finDateTime = new Date(dayDate)
    finDateTime.setHours(hFin, mFin, 0, 0)

    const diffMs = finDateTime.getTime() - debutDateTime.getTime()
    const duree = diffMs / (1000 * 60 * 60)

    // --- CHECK FOR ANY EXISTING ENTRY ON THAT DAY (STRICT) ---
    const existing = await prisma.pointage.findFirst({
      where: {
        utilisateurId: targetUserId,
        date: dayDate,
      }
    })

    if (existing) {
      console.log(`Un pointage existe déjà pour le ${dayDate.toLocaleDateString()}. Un seul enregistrement par jour est autorisé.`)
      return null // On ignore ce jour là
    }

    // On prépare l'objet data proprement pour Prisma
    const pointageData: any = {
      date: dayDate,
      type: data.type || 'TRAVAIL',
      debut: debutDateTime,
      fin: finDateTime,
      duree,
      commentaire: cleanCommentaire,
      utilisateur: { connect: { id: targetUserId } }
    }

    if (data.chantierId) {
      pointageData.chantier = { connect: { id: data.chantierId } }
    }

    return prisma.pointage.create({
      data: pointageData,
      include: {
        chantier: { select: { titre: true } },
        utilisateur: { select: { nom: true } }
      }
    })
  }))

  const validResults = results.filter(r => r !== null) as any[]
  if (validResults.length === 0) {
    throw new Error("Toutes les dates sélectionnées possèdent déjà un pointage identique.")
  }

  const firstPointage = validResults[0]
  const totalDuree = validResults.reduce((acc, p) => acc + p.duree, 0)

  const typeLabel = data.type ? data.type.toLowerCase().replace('_', ' ') : 'travail'
  const locationLabel = firstPointage.chantier ? `sur "${firstPointage.chantier.titre}"` : `(Absence générale)`
  
  const details = validResults.length > 1 
    ? `Pointage (${typeLabel}) multi-jours (${validResults.length}j) pour un total de ${totalDuree.toFixed(2).replace('.', ',')}h effectué pour ${firstPointage.utilisateur.nom} ${locationLabel}`
    : `Pointage (${typeLabel}) de ${totalDuree.toFixed(2).replace('.', ',')}h effectué pour ${firstPointage.utilisateur.nom} ${locationLabel}`

  const journalData: any = {
    action: 'POINTAGE',
    auteur: { connect: { id: me.id } },
    details
  }

  if (data.chantierId) {
    journalData.chantier = { connect: { id: data.chantierId } }
  }

  await prisma.actionJournal.create({ data: journalData }).catch(() => {})

  revalidatePath('/dashboard')
  if (data.chantierId) revalidatePath(`/chantiers/${data.chantierId}`)
  revalidatePath('/journal')
  revalidatePath(`/utilisateurs/${targetUserId}/pointages`)
}

export async function getUserBusyDatesAction(userId: string) {
  const pointages = await prisma.pointage.findMany({
    where: { utilisateurId: userId },
    select: { date: true }
  })
  return pointages.map(p => p.date.toISOString().split('T')[0])
}

export async function deletePointageAction(id: string) {
  const me = await getCurrentUser()
  if (!me || me.role !== 'CHEF_CHANTIER') {
    throw new Error('Action réservée aux chefs de chantier')
  }

  const pointage = await prisma.pointage.findUnique({
    where: { id },
    include: { utilisateur: { select: { nom: true } } }
  })

  if (!pointage) throw new Error('Pointage non trouvé')

  await prisma.pointage.delete({ where: { id } })

  await prisma.actionJournal.create({
    data: {
      action: 'POINTAGE',
      auteur: { connect: { id: me.id } },
      details: `Suppression d'un pointage (${pointage.type}) pour ${pointage.utilisateur.nom}`,
      ...(pointage.chantierId ? { chantier: { connect: { id: pointage.chantierId } } } : {})
    }
  }).catch(() => {})

  revalidatePath('/dashboard')
  revalidatePath('/journal')
  revalidatePath(`/utilisateurs/${pointage.utilisateurId}/pointages`)
  if (pointage.chantierId) revalidatePath(`/chantiers/${pointage.chantierId}`)
}
