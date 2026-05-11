import { prisma } from './prisma'
import { StatutChantier } from '@prisma/client'
import { notifyProjectMembers } from './notifications'

/**
 * Met à jour automatiquement les chantiers :
 * 1. Démarre ceux dont la date de début est arrivée (EN_ATTENTE -> EN_COURS)
 * 2. Termine ceux dont la date de fin est dépassée (EN_COURS -> TERMINE)
 */
export async function autoUpdateChantierStatuts() {
  const now = new Date()
  
  // Fin de journée pour le démarrage
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  // Début de journée pour la clôture (un chantier se termine APRES sa date de fin)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  // 1. Démarrage des chantiers
  const chantiersToStart = await prisma.chantier.findMany({
    where: {
      statut: StatutChantier.EN_ATTENTE,
      dateDebutPrevue: { lte: endOfToday },
    },
    select: { id: true, titre: true, createdById: true },
  })

  if (chantiersToStart.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: chantiersToStart.map(c => c.id) } },
      data: { statut: StatutChantier.EN_COURS },
    })

    for (const c of chantiersToStart) {
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: c.id,
          auteurId: c.createdById, 
          details: `Démarrage automatique (Date de début atteinte)`,
        }
      }).catch(err => console.error(`[AutoStatut] Journal error for ${c.titre}:`, err))

      await notifyProjectMembers(
        c.id,
        "Démarrage automatique",
        `Le chantier "${c.titre}" a démarré automatiquement aujourd'hui.`
      )
    }

    console.log(`[AutoStatut] ${chantiersToStart.length} chantier(s) passé(s) en EN_COURS : ${chantiersToStart.map(c => c.titre).join(', ')}`)
  }

  // 2. Clôture des chantiers (si date de fin < aujourd'hui)
  const chantiersToFinish = await prisma.chantier.findMany({
    where: {
      statut: StatutChantier.EN_COURS,
      dateFinPrevue: { lt: startOfToday },
    },
    select: { id: true, titre: true, createdById: true },
  })

  if (chantiersToFinish.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: chantiersToFinish.map(c => c.id) } },
      data: { statut: StatutChantier.TERMINE },
    })

    for (const c of chantiersToFinish) {
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: c.id,
          auteurId: c.createdById,
          details: `Clôture automatique (Date de fin dépassée)`,
        }
      }).catch(err => console.error(`[AutoStatut] Journal error for ${c.titre}:`, err))

      await notifyProjectMembers(
        c.id,
        "Clôture automatique",
        `Le chantier "${c.titre}" a été clôturé automatiquement.`
      )
    }

    console.log(`[AutoStatut] ${chantiersToFinish.length} chantier(s) passé(s) en TERMINE : ${chantiersToFinish.map(c => c.titre).join(', ')}`)
  }
}

export async function getUserBusyDates(userId: string) {
  const pointages = await prisma.pointage.findMany({
    where: { utilisateurId: userId },
    select: { date: true }
  })
  return pointages.map(p => p.date.toISOString().split('T')[0])
}
