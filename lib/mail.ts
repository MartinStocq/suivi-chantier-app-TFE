import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoie un email via Resend (API) ou SMTP.
 */
export async function sendMail({ to, subject, text, html }: MailOptions) {
  console.log(`[MAIL] Tentative d'envoi d'email à: ${to} (Sujet: ${subject})`);

  // Option 1 : Resend (Préféré en production si configuré)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey !== "" && resendApiKey !== "your_resend_api_key") {
    try {
      console.log('[MAIL] Utilisation de Resend API...');
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.MAIL_FROM || 'onboarding@resend.dev';
      
      const result = await resend.emails.send({
        from: `Suivi de Chantier <${fromEmail}>`,
        to: [to],
        subject,
        text,
        html: html || text,
      });

      if (result.error) {
        console.error('[MAIL] Erreur Resend détaillée:', result.error);
        console.log('[MAIL] Échec Resend, tentative de repli sur SMTP...');
      } else {
        console.log('[MAIL] Email envoyé avec succès via Resend:', result.data?.id);
        return result.data;
      }
    } catch (error) {
      console.error('[MAIL] Exception lors de l\'envoi via Resend:', error);
      console.log('[MAIL] Exception Resend, tentative de repli sur SMTP...');
    }
  } else {
    console.log('[MAIL] RESEND_API_KEY absente ou invalide, utilisation du SMTP.');
  }

  // Option 2 : SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('[MAIL] ERREUR : Configuration SMTP manquante (SMTP_USER ou SMTP_PASSWORD).');
    return;
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  console.log(`[MAIL] Initialisation SMTP: ${smtpHost}:${smtpPort} (secure: ${smtpSecure}, user: ${process.env.SMTP_USER})`);

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"Suivi de Chantier" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    
    console.log('[MAIL] Email envoyé avec succès via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('[MAIL] Erreur SMTP critique:', error);
    
    if (smtpPort === 465) {
      console.info('[MAIL] Conseil: Si vous êtes sur un hébergeur cloud (Vercel, etc.), essayez le port 587 avec SMTP_SECURE=false');
    }
    
    throw error;
  }
}
