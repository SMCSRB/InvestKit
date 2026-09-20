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

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationCode: string
) => {
  try {
    const provider = getEmailProvider();
    const htmlContent = generateVerificationEmailHTML(firstName, verificationCode);

    // Send via Resend
    if (provider === 'resend' && resendClient) {
      console.log(`📨 Sending verification email via Resend to ${email}...`);
      const result = await resendClient.emails.send({
        from: 'InvestKit <noreply@investkit.com>',
        to: email,
        subject: 'Vérifiez votre adresse email - InvestKit',
        html: htmlContent,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log(`✅ Email sent successfully to ${email} (Resend ID: ${result.data.id})`);
      return result.data;
    }

    // Send via Nodemailer (Ethereal or SMTP)
    const transporter = await initEmailTransporter();
    const mailOptions = {
      from: '"InvestKit" <noreply@investkit.com>',
      to: email,
      subject: 'Vérifiez votre adresse email - InvestKit',
      html: htmlContent,
    };

    console.log(`📨 Sending verification email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);

    // For testing with Ethereal, log the preview URL if available
    if (etherealAccount && info.response && info.response.includes('250')) {
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 Preview URL: ${previewUrl}`);
        }
      } catch (e) {
        // Ethereal preview not available in this mode
      }
    }

    return info;
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    // Don't throw - let the registration continue
    return { error: error.message };
  }
};
