import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendMeteoNotification(
  email: string, 
  chantierTitre: string, 
  action: 'SUSPENDU' | 'REPRIS', 
  reason: string
) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping notification');
    return;
  }

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
    console.log(`Notification sent to ${email} for chantier ${chantierTitre}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
}
