// Offres et prix : UNIQUE source. Utilisé par l'accueil ; le tableau de bord doit importer d'ici (pas de prix recopiés ailleurs).
// Les identifiants de prix Stripe restent côté serveur (STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY).

export const PRICES = { monthly: 7.99, yearly: 79 };

// Tant que le paiement n'est pas branché, aucun bouton ne prétend encaisser quoi que ce soit.
export const BILLING_OPEN = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

export const yearlySavingPct = () => Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100);

export const formatEuro = (v) => `${v.toFixed(2).replace('.', ',').replace(',00', '')} €`;

export const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    tagline: 'Pour apprendre et t\'entraîner sur un domaine.',
    features: [
      'Éducation sur tous les domaines (cours, glossaire, quiz)',
      'Un domaine de simulation au choix, avec tableau de bord et impression PDF des simulateurs',
      'Capital de départ en InvestCoins',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Pour simuler tous les domaines ensemble.',
    highlight: true,
    features: [
      'Tous les domaines de simulation (accès multi-domaines)',
      'Vue d\'ensemble de tous les domaines sur le tableau de bord',
      'Changement de domaine sans limite (un seul changement en Gratuit)',
      'Capital de départ plus élevé',
    ],
  },
];
