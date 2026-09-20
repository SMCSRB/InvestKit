import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'investkit',
    user: process.env.DB_USER || 'investkit',
    password: process.env.DB_PASSWORD || 'password',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Email Configuration
  emailProvider: process.env.EMAIL_PROVIDER || 'ethereal', // 'resend', 'ethereal', or 'smtp'
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'noreply@investkit.com',

  // SMTP Configuration (for Gmail, Outlook, etc.)
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === 'true',
  },
};

// Validation
const requiredEnvVars = ['JWT_SECRET'];
const missing = requiredEnvVars.filter(
  (key) => !process.env[key] && env.isProd
);

if (missing.length > 0 && env.isProd) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
