import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Reverse proxy : nombre de proxys de confiance devant l'API (nginx/Caddy = 1). Sans cela, derrière un proxy, TOUS les visiteurs
  // partageraient la même adresse IP pour la limitation de débit et le journal d'audit. « false » = aucun proxy (accès direct).
  trustProxy: ((): number | false => {
    const raw = process.env.TRUST_PROXY;
    if (raw === 'false' || raw === '0') return false;
    if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10);
    return process.env.NODE_ENV === 'production' ? 1 : false;
  })(),

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

  // CORS - accepte une liste d'origines séparées par des virgules
  corsOrigins: (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim()),

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

  // Stripe (Phase 2A - abonnement Pro)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY, // 7,99€/mois
    priceIdYearly: process.env.STRIPE_PRICE_ID_YEARLY, // 79€/an
  },

  // Inscription sur invitation (phase de test) : ACTIVE par défaut. Mettre
  // INVITE_ONLY=false pour ouvrir l'inscription à tous.
  inviteOnly: process.env.INVITE_ONLY !== 'false',

  // Source des données immobilières : 'fictive' (catalogue imaginaire) ; 'dvf' plus tard.
  realEstateSource: process.env.REAL_ESTATE_SOURCE || 'fictive',

  // URL du frontend (redirections Stripe Checkout / Customer Portal)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Avertissements de configuration en production (non bloquants pour ne pas
// casser un déploiement existant, mais visibles dans les logs).
if (env.isProd) {
  if (env.corsOrigins.includes('*')) {
    console.warn('⚠️  CORS_ORIGIN non défini : toutes les origines sont acceptées. Définis-le (ex: https://ton-domaine).');
  }
  if (!process.env.DATABASE_URL && env.database.password === 'password') {
    console.warn('⚠️  Mot de passe base de données par défaut ("password") : définis DATABASE_URL ou DB_PASSWORD.');
  }
  if (env.jwtSecret === 'dev-secret-key' || env.jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET trop court ou par défaut (32 caractères minimum recommandés).');
  }
}

// Validation
const requiredEnvVars = ['JWT_SECRET'];
const missing = requiredEnvVars.filter(
  (key) => !process.env[key] && env.isProd
);

if (missing.length > 0 && env.isProd) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
