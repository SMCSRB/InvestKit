import nodemailer from 'nodemailer';

let transporter: any = null;

export const initEmailTransporter = async () => {
  if (transporter) return transporter;

  // Use Ethereal for testing (free, no setup required)
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('📧 Ethereal test account created');
  console.log(`   Email: ${testAccount.user}`);

  return transporter;
};

export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationCode: string
) => {
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

  const info = await transporter.sendMail(mailOptions);

  // For testing, log the preview URL
  if (info.response.includes('250')) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📨 Email sent to ${email}`);
    console.log(`   Preview: ${previewUrl}`);
  }

  return info;
};
