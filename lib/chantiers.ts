import { prisma } from './prisma'
import { StatutChantier } from '@prisma/client'

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
    select: { id: true, titre: true },
  })

  if (chantiersToStart.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: chantiersToStart.map(c => c.id) } },
      data: { statut: StatutChantier.EN_COURS },
    })
    console.log(`[AutoStatut] ${chantiersToStart.length} chantier(s) passé(s) en EN_COURS : ${chantiersToStart.map(c => c.titre).join(', ')}`)
  }

  // 2. Clôture des chantiers (si date de fin < aujourd'hui)
  const chantiersToFinish = await prisma.chantier.findMany({
    where: {
      statut: StatutChantier.EN_COURS,
      dateFinPrevue: { lt: startOfToday },
    },
    select: { id: true, titre: true },
  })

  if (chantiersToFinish.length > 0) {
    await prisma.chantier.updateMany({
      where: { id: { in: chantiersToFinish.map(c => c.id) } },
      data: { statut: StatutChantier.TERMINE },
    })
    console.log(`[AutoStatut] ${chantiersToFinish.length} chantier(s) passé(s) en TERMINE : ${chantiersToFinish.map(c => c.titre).join(', ')}`)
  }
}
