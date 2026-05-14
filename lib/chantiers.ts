import { prisma } from './prisma'
import { StatutChantier } from '@prisma/client'
import { notifyProjectMembers } from './notifications'

/**
 * Met à jour automatiquement les chantiers :
 * 1. Clôture ceux dont la date de fin est dépassée (EN_COURS/SUSPENDU/EN_ATTENTE -> TERMINE)
 * 2. Démarre ceux dont la date de début est arrivée (EN_ATTENTE -> EN_COURS)
 * 3. Ré-ouvre ceux qui sont TERMINE mais dont la date a été prolongée (TERMINE -> EN_COURS)
 */
export async function autoUpdateChantierStatuts() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayTime = today.getTime()

  // --- 1. CLÔTURE (Date fin < Aujourd'hui) ---
  const chantiersToFinish = await prisma.chantier.findMany({
    where: {
      statut: { in: [StatutChantier.EN_COURS, StatutChantier.SUSPENDU, StatutChantier.EN_ATTENTE] },
      dateFinPrevue: { not: null },
    },
    select: { id: true, titre: true, createdById: true, dateFinPrevue: true },
  })

  const toFinishIds = chantiersToFinish
    .filter(c => {
      const d = new Date(c.dateFinPrevue!)
      const finishDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return finishDate.getTime() < todayTime
    })
    .map(c => c.id)

  if (toFinishIds.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: toFinishIds } },
      data: { statut: StatutChantier.TERMINE },
    })
    for (const id of toFinishIds) {
      const c = chantiersToFinish.find(x => x.id === id)!
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: c.id,
          auteurId: c.createdById,
          details: `Clôture automatique (Date de fin dépassée)`,
        }
      }).catch(() => {})
      await notifyProjectMembers(c.id, "Clôture automatique", `Le chantier "${c.titre}" a été clôturé automatiquement.`)
    }
  }

  // --- 2. DÉMARRAGE (EN_ATTENTE -> EN_COURS) ---
  const chantiersToStart = await prisma.chantier.findMany({
    where: {
      statut: StatutChantier.EN_ATTENTE,
      dateDebutPrevue: { lte: now },
    },
    select: { id: true, titre: true, createdById: true, dateFinPrevue: true },
  })

  const toStartIds = chantiersToStart
    .filter(c => {
      if (!c.dateFinPrevue) return true
      const d = new Date(c.dateFinPrevue)
      const finishDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return finishDate.getTime() >= todayTime
    })
    .map(c => c.id)

  if (toStartIds.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: toStartIds } },
      data: { statut: StatutChantier.EN_COURS },
    })
    for (const id of toStartIds) {
      const c = chantiersToStart.find(x => x.id === id)!
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: c.id,
          auteurId: c.createdById, 
          details: `Démarrage automatique (Date de début atteinte)`,
        }
      }).catch(() => {})
      await notifyProjectMembers(c.id, "Démarrage automatique", `Le chantier "${c.titre}" a démarré automatiquement.`)
    }
  }

  // --- 3. RÉ-OUVERTURE (TERMINE -> EN_COURS si prolongé) ---
  const chantiersToReopen = await prisma.chantier.findMany({
    where: { statut: StatutChantier.TERMINE },
    select: { id: true, titre: true, createdById: true, dateDebutPrevue: true, dateFinPrevue: true },
  })

  const toReopenIds = chantiersToReopen
    .filter(c => {
      // Un chantier ré-ouvre si DateDébut <= Aujourd'hui ET (DateFin est null OU DateFin >= Aujourd'hui)
      const startD = new Date(c.dateDebutPrevue)
      const startDate = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate())
      
      let isEndDateValid = true
      if (c.dateFinPrevue) {
        const endD = new Date(c.dateFinPrevue)
        const endDate = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate())
        isEndDateValid = endDate.getTime() >= todayTime
      }

      return startDate.getTime() <= todayTime && isEndDateValid
    })
    .map(c => c.id)

  if (toReopenIds.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: toReopenIds } },
      data: { statut: StatutChantier.EN_COURS },
    })
    for (const id of toReopenIds) {
      const c = chantiersToReopen.find(x => x.id === id)!
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: c.id,
          auteurId: c.createdById, 
          details: `Ré-ouverture automatique (Date de fin prolongée)`,
        }
      }).catch(() => {})
      await notifyProjectMembers(c.id, "Ré-ouverture automatique", `Le chantier "${c.titre}" a été ré-ouvert car sa date de fin a été prolongée.`)
    }
    console.log(`[AutoStatut] ${toReopenIds.length} chantiers ré-ouverts.`)
  }
}

export async function getUserBusyDates(userId: string) {
  const pointages = await prisma.pointage.findMany({
    where: { utilisateurId: userId },
    select: { date: true }
  })
  return pointages.map(p => p.date.toISOString().split('T')[0])
}
