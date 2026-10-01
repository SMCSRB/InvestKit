import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env';
import { renderMail, MailContent } from './emailTemplate';

let transporter: any = null;
let resendClient: any = null;
let etherealAccount: any = null;

const getEmailProvider = () => {
  if (env.emailProvider === 'resend' && env.resendApiKey) {
    return 'resend';
  }
  if (env.emailProvider === 'smtp' && env.smtp.host && env.smtp.user && env.smtp.pass) {
    return 'smtp';
  }
  return 'ethereal';
};

export const initEmailTransporter = async () => {
  if (transporter && getEmailProvider() !== 'resend') return transporter;

  const provider = getEmailProvider();

  // Resend provider
  if (provider === 'resend' && env.resendApiKey) {
    console.log('📧 Initializing Resend email provider...');
    resendClient = new Resend(env.resendApiKey);
    transporter = { provider: 'resend' };
    console.log('✅ Resend initialized');
    return transporter;
  }

  // SMTP provider (Gmail, Outlook, custom)
  if (provider === 'smtp') {
    console.log('📧 Initializing SMTP provider...');
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
    console.log(`✅ SMTP initialized (${env.smtp.host}:${env.smtp.port})`);
    return transporter;
  }

  // Ethereal provider (Development)
  try {
    console.log('📧 Creating Ethereal test account...');
    etherealAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    console.log('✅ Ethereal test account created');
    console.log(`   Email: ${etherealAccount.user}`);
    console.log(`   SMTP: ${etherealAccount.smtp.host}:${etherealAccount.smtp.port}`);
    console.log('   📋 Emails preview: Check console logs for preview URLs');
  } catch (error: any) {
    console.error('❌ Ethereal account creation failed:', error.message);
    console.log('📧 Using fallback in-memory transporter...');

    // Use a dummy transporter that logs to console
    transporter = {
      sendMail: async (mailOptions: any) => {
        console.log('📨 [DEV MODE] Email would be sent:');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        return { response: '250 OK (dev mode)' };
      }
    };
  }

  return transporter;
};

// Envoi générique (Resend, SMTP ou Ethereal selon la configuration). Ne lève jamais : l'échec est journalisé et renvoyé.
export const deliverEmail = async (to: string, subject: string, html: string, text?: string) => {
  try {
    await initEmailTransporter(); // Initialize first
    const provider = getEmailProvider();

    // Send via Resend
    if (provider === 'resend' && resendClient) {
      console.log(`📨 Sending email via Resend to ${to}...`);
      try {
        const result = await resendClient.emails.send({ from: 'onboarding@resend.dev', to, subject, html, ...(text ? { text } : {}) });
        console.log(`✅ Email sent successfully to ${to}`);
        return result;
      } catch (resendError: any) {
        throw new Error(`Resend error: ${resendError.message}`);
      }
    }

    // Send via Nodemailer (Ethereal or SMTP)
    const transporter = await initEmailTransporter();
    console.log(`📨 Sending email to ${to}...`);
    const info = await transporter.sendMail({ from: '"InvestKit" <noreply@investkit.com>', to, subject, html, ...(text ? { text } : {}) });
    console.log(`✅ Email sent successfully to ${to}`);

    // For testing with Ethereal, log the preview URL if available
    if (etherealAccount && info.response && info.response.includes('250')) {
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) console.log(`🔗 Preview URL: ${previewUrl}`);
      } catch (e) {
        // Ethereal preview not available in this mode
      }
    }

    return info;
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    // Don't throw - let the caller continue
    return { error: error.message };
  }
};

// Contenus des e-mails (un seul gabarit : utils/emailTemplate.ts). Fonctions pures, réutilisées par l'aperçu (npm run mail:preview).
export const verificationMail = (name: string | null | undefined, code: string, verifyUrl: string): MailContent => ({
  subject: 'Ton code de vérification InvestKit',
  preheader: `Ton code : ${code}. Il est valable 15 minutes.`,
  title: 'Vérifie ton adresse e-mail',
  greetingName: name,
  hero: 'coin',
  paragraphs: ['Bienvenue sur InvestKit ! Plus qu\'une étape : confirme ton adresse e-mail pour commencer à investir en simulation.'],
  code: { value: code, caption: 'Ton code de vérification' },
  button: { label: 'Vérifier mon e-mail', url: verifyUrl },
  notes: ['Ce code expire dans 15 minutes.', 'Tu n\'as pas créé de compte ? Ignore ce message, il ne se passera rien.'],
});

export const passwordResetMail = (name: string | null | undefined, link: string): MailContent => ({
  subject: 'Choisis un nouveau mot de passe InvestKit',
  preheader: 'Ce lien est valable 1 heure et ne sert qu\'une fois.',
  title: 'Nouveau mot de passe',
  greetingName: name,
  hero: 'shield',
  paragraphs: ['Tu as demandé à changer ton mot de passe. Clique sur le bouton pour en choisir un nouveau.'],
  button: { label: 'Choisir un nouveau mot de passe', url: link },
  notes: ['Ce lien est valable 1 heure et ne peut servir qu\'une fois.', 'Ce n\'est pas toi ? Ignore ce message : ton mot de passe ne change pas.'],
});

export const accountExistsMail = (loginUrl: string, resetUrl: string): MailContent => ({
  subject: 'Quelqu\'un a essayé de créer un compte avec ton adresse',
  preheader: 'Ton compte existe déjà : rien n\'a été modifié.',
  title: 'Ton compte existe déjà',
  hero: 'shield',
  paragraphs: [
    'Quelqu\'un a essayé de créer un compte InvestKit avec cette adresse e-mail. Elle a déjà un compte : si c\'est toi, connecte-toi.',
    'Si tu as oublié ton mot de passe, tu peux en choisir un nouveau. Si ce n\'est pas toi, ignore ce message : ton compte n\'a pas été modifié.',
  ],
  button: { label: 'Me connecter', url: loginUrl },
  notes: [`Mot de passe oublié ? Choisis-en un nouveau sur ${resetUrl}`],
});

export const welcomeMail = (name: string | null | undefined, appUrl: string): MailContent => ({
  subject: 'Bienvenue sur InvestKit',
  preheader: 'Ton compte est prêt : viens découvrir ton portefeuille.',
  title: 'Bienvenue à bord !',
  greetingName: name,
  hero: 'chart',
  paragraphs: ['Ton compte est prêt. Tu peux investir en Bourse, en immobilier et en crypto avec des InvestCoins, la monnaie du jeu, et apprendre à ton rythme grâce aux cours et aux quiz.'],
  button: { label: 'Ouvrir InvestKit', url: appUrl },
});

const sendMail = (to: string, c: MailContent) => {
  const { subject, html, text } = renderMail(c);
  return deliverEmail(to, subject, html, text);
};

export const sendVerificationEmail = async (email: string, name: string | null | undefined, verificationCode: string) => {
  const base = env.frontendUrl.replace(/\/$/, '');
  return sendMail(email, verificationMail(name, verificationCode, `${base}/verify-email?email=${encodeURIComponent(email)}`));
};

export const sendPasswordResetEmail = async (email: string, link: string, name?: string | null) =>
  sendMail(email, passwordResetMail(name, link));

// Envoyé quand quelqu'un tente de s'inscrire avec une adresse qui a déjà un compte : le site répond pareil à l'écran (aucune fuite),
// et le vrai propriétaire de l'adresse est prévenu ici, dans sa boîte.
export const sendAccountExistsEmail = async (email: string, loginUrl: string, resetUrl: string) =>
  sendMail(email, accountExistsMail(loginUrl, resetUrl));

export const sendWelcomeEmail = async (email: string, name?: string | null) =>
  sendMail(email, welcomeMail(name, env.frontendUrl.replace(/\/$/, '') + '/dashboard'));
