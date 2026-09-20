import nodemailer from 'nodemailer';

let transporter: any = null;
let etherealAccount: any = null;

export const initEmailTransporter = async () => {
  if (transporter) return transporter;

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

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationCode: string
) => {
  try {
    const transporter = await initEmailTransporter();

    const mailOptions = {
      from: '"InvestKit" <noreply@investkit.com>',
      to: email,
      subject: 'Vérifiez votre adresse email - InvestKit',
      html: `
        <h2>Bienvenue sur InvestKit!</h2>
        <p>Bonjour ${firstName},</p>
        <p>Pour compléter votre inscription, veuillez vérifier votre adresse email.</p>
        <p><strong>Votre code de vérification:</strong></p>
        <p style="font-size: 24px; font-weight: bold; color: #ff6b6b; letter-spacing: 2px;">
          ${verificationCode}
        </p>
        <p>Ce code expire dans 24 heures.</p>
        <p>Si vous n'avez pas créé de compte, ignorez ce message.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">
          © 2026 InvestKit - Plateforme d'investissement
        </p>
      `,
    };

    console.log(`📨 Sending verification email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);

    // For testing with Ethereal, log the preview URL if available
    if (etherealAccount && info.response && info.response.includes('250')) {
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 Preview: ${previewUrl}`);
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
