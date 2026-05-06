import { Resend } from 'resend';
import { prisma } from './prisma';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendMeteoNotification(
  email: string, 
  chantierTitre: string, 
  action: 'SUSPENDU' | 'REPRIS', 
  reason: string,
  chantierId?: string
) {
  // 1. Notification par email
  if (resend) {
    const subject = `[ALERTE MÉTÉO] Chantier ${chantierTitre} : ${action}`;
    
    try {
      await resend.emails.send({
        from: 'Meteo <onboarding@resend.dev>', // À changer en prod
        to: email,
        subject: subject,
        html: `
          <h1>Alerte Météo Automatique</h1>
          <p>Le statut du chantier <strong>${chantierTitre}</strong> a été automatiquement mis à jour.</p>
          <p>Nouveau statut : <strong>${action}</strong></p>
          <p>Raison : ${reason}</p>
          <hr />
          <p>Ceci est un message automatique du système de suivi de chantier.</p>
        `
      });
      console.log(`Email notification sent to ${email} for chantier ${chantierTitre}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
    }
  } else {
    console.warn('RESEND_API_KEY not set, skipping email notification');
  }

  // 2. Notification In-App
  try {
    const user = await prisma.utilisateur.findUnique({
      where: { email }
    });

    if (user) {
      await createInAppNotification(
        user.id,
        `Alerte Météo : ${chantierTitre}`,
        `Le chantier est désormais ${action.toLowerCase()} en raison de : ${reason}`,
        chantierId ? `/chantiers/${chantierId}` : undefined
      );
    }
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
  }
}

export async function createInAppNotification(userId: string, titre: string, message: string, lien?: string) {
  try {
    // On utilise un cast 'as any' pour bypasser l'erreur de validation persistante
    // sur le champ 'lien' qui est pourtant présent dans le schéma et la DB.
    const notif = await (prisma.notification as any).create({
      data: {
        userId,
        titre,
        message,
        lien,
        lu: false
      }
    });
    console.log(`[Notification] Created for user ${userId}: ${titre}`);
    return notif;
  } catch (error) {
    console.error(`[Notification ERROR] Failed for user ${userId}:`, error);
  }
}

export async function notifyProjectMembers(chantierId: string, titre: string, message: string, excludeUserId?: string, lien?: string) {
  console.log(`[notifyProjectMembers] START for chantier ${chantierId}. Titre: ${titre}`);
  try {
    const chantier = await prisma.chantier.findUnique({
      where: { id: chantierId },
      include: {
        affectations: { select: { userId: true } },
      }
    });

    if (!chantier) {
      console.warn(`[notifyProjectMembers] Chantier ${chantierId} not found!`);
      return;
    }

    // Récupérer tous les IDs uniques (Créateur + Ouvriers)
    const userIds = new Set<string>();
    userIds.add(chantier.createdById);
    chantier.affectations.forEach(a => userIds.add(a.userId));

    console.log(`[notifyProjectMembers] Found ${userIds.size} potential recipients. Exclude: ${excludeUserId}`);

    // Envoyer à tout le monde sauf l'éventuel auteur de l'action
    const targetLink = lien || `/chantiers/${chantierId}`;

    let count = 0;
    for (const userId of userIds) {
      if (userId !== excludeUserId) {
        console.log(`[notifyProjectMembers] Creating notification for user ${userId}`);
        await createInAppNotification(userId, titre, message, targetLink);
        count++;
      } else {
        console.log(`[notifyProjectMembers] Skipping excluded user ${userId}`);
      }
    }
    console.log(`[notifyProjectMembers] FINISHED. ${count} notifications created.`);
  } catch (error) {
    console.error('[notifyProjectMembers ERROR]:', error);
  }
}
