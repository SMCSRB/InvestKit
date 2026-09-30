import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env';

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

const generateVerificationEmailHTML = (firstName: string, verificationCode: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
        .content { background: #f8fafc; padding: 30px; border-radius: 8px; }
        .code-box { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; }
        .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">💎 InvestKit</h1>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Bienvenue sur InvestKit!</h2>
          <p style="color: #475569; font-size: 16px;">Bonjour ${firstName},</p>
          <p style="color: #475569; font-size: 16px;">Pour compléter votre inscription, veuillez entrer le code de vérification ci-dessous:</p>
          <div class="code-box">${verificationCode}</div>
          <p style="color: #64748b; font-size: 14px;">⏰ Ce code expire dans <strong>15 minutes</strong>.</p>
          <p style="color: #64748b; font-size: 14px;">Si vous n'avez pas créé de compte, ignorez ce message.</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© 2026 InvestKit - Plateforme d'investissement</p>
          <p style="margin: 5px 0 0 0;">Tous les droits réservés</p>
        </div>
      </div>
    </body>
  </html>
`;

// Envoi générique (Resend, SMTP ou Ethereal selon la configuration). Ne lève jamais : l'échec est journalisé et renvoyé.
export const deliverEmail = async (to: string, subject: string, html: string) => {
  try {
    await initEmailTransporter(); // Initialize first
    const provider = getEmailProvider();

    // Send via Resend
    if (provider === 'resend' && resendClient) {
      console.log(`📨 Sending email via Resend to ${to}...`);
      try {
        const result = await resendClient.emails.send({ from: 'onboarding@resend.dev', to, subject, html });
        console.log(`✅ Email sent successfully to ${to}`);
        return result;
      } catch (resendError: any) {
        throw new Error(`Resend error: ${resendError.message}`);
      }
    }

    // Send via Nodemailer (Ethereal or SMTP)
    const transporter = await initEmailTransporter();
    console.log(`📨 Sending email to ${to}...`);
    const info = await transporter.sendMail({ from: '"InvestKit" <noreply@investkit.com>', to, subject, html });
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

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationCode: string
) => deliverEmail(email, 'Vérifiez votre adresse email - InvestKit', generateVerificationEmailHTML(firstName, verificationCode));

const generatePasswordResetEmailHTML = (link: string) => `
  <!DOCTYPE html>
  <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; margin:0; padding:20px;">
      <div style="max-width:600px; margin:0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color:white; padding:24px; border-radius:8px; text-align:center;">
          <h1 style="margin:0; font-size:26px;">💎 InvestKit</h1>
        </div>
        <div style="background:white; padding:28px; border-radius:8px; margin-top:16px;">
          <h2 style="color:#0f172a; margin-top:0;">Réinitialisation du mot de passe</h2>
          <p style="color:#475569; font-size:16px;">Vous avez demandé à changer votre mot de passe. Ce lien est valable <strong>1 heure</strong> et ne peut servir qu'une fois :</p>
          <p style="text-align:center; margin:28px 0;"><a href="${link}" style="background:#3b82f6; color:white; padding:14px 26px; border-radius:8px; text-decoration:none; font-weight:700;">Choisir un nouveau mot de passe</a></p>
          <p style="color:#64748b; font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.</p>
        </div>
      </div>
    </body>
  </html>
`;

export const sendPasswordResetEmail = async (email: string, link: string) =>
  deliverEmail(email, 'Réinitialisation de votre mot de passe - InvestKit', generatePasswordResetEmailHTML(link));
