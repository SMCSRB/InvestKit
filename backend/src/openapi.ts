// Spécification OpenAPI 3.0 de l'API (générée depuis un tableau de routes).
// Le test tests/openapi.test.ts vérifie que ce tableau couvre TOUTES les
// routes réellement montées dans l'application : ajouter une route sans la
// décrire ici fait échouer les tests.

type Row = [method: 'get' | 'post', path: string, tag: string, summary: string, access?: 'public' | 'admin'];

export const ROUTES: Row[] = [
  ['get', '/auth/signup-config', 'Compte', 'Configuration de l\'inscription (invitation ou non)', 'public'],
  ['post', '/auth/register', 'Compte', 'Créer un compte', 'public'],
  ['post', '/auth/login', 'Compte', 'Se connecter (renvoie un jeton, ou demande le code 2FA)', 'public'],
  ['post', '/auth/verify-email', 'Compte', 'Valider l\'e-mail avec le code à 6 chiffres', 'public'],
  ['post', '/auth/resend-code', 'Compte', 'Renvoyer le code de vérification', 'public'],
  ['post', '/auth/save-preferences', 'Compte', 'Enregistrer les préférences d\'inscription', 'public'],
  ['post', '/auth/forgot-password', 'Compte', 'Demander une réinitialisation du mot de passe', 'public'],
  ['post', '/auth/reset-password', 'Compte', 'Réinitialiser le mot de passe', 'public'],
  ['get', '/auth/check-email/{email}', 'Compte', 'Vérifier si un e-mail est déjà utilisé', 'public'],
  ['post', '/auth/2fa/login-verify', 'Compte', 'Terminer la connexion avec le code 2FA', 'public'],
  ['get', '/auth/me', 'Compte', 'Profil de l\'utilisateur connecté'],
  ['post', '/auth/set-free-domain', 'Compte', 'Choisir le domaine gratuit'],
  ['post', '/auth/2fa/setup', 'Compte', 'Démarrer l\'activation de la 2FA'],
  ['post', '/auth/2fa/verify-setup', 'Compte', 'Confirmer l\'activation de la 2FA'],
  ['post', '/auth/2fa/disable', 'Compte', 'Désactiver la 2FA'],
  ['get', '/auth/me/export', 'RGPD', 'Télécharger toutes ses données (JSON)'],
  ['post', '/auth/me/delete', 'RGPD', 'Supprimer son compte (mot de passe + phrase SUPPRIMER)'],
  ['post', '/billing/create-checkout-session', 'Abonnement', 'Ouvrir le paiement Stripe'],
  ['post', '/billing/create-portal-session', 'Abonnement', 'Ouvrir le portail client Stripe'],
  ['post', '/billing/webhook', 'Abonnement', 'Webhook Stripe (signature vérifiée)', 'public'],
  ['get', '/economy/balance', 'InvestCoins', 'Solde de pièces'],
  ['get', '/economy/history', 'InvestCoins', 'Historique des transactions'],
  ['post', '/economy/daily-reward', 'InvestCoins', 'Récompense quotidienne'],
  ['get', '/economy/admin/coins-by-domain', 'InvestCoins', 'Statistiques admin des pièces par domaine', 'admin'],
  ['post', '/education/complete-chapter', 'Éducation', 'Valider un chapitre'],
  ['post', '/education/complete-domain', 'Éducation', 'Valider un domaine'],
  ['get', '/trading/domains', 'Bourse / Crypto', 'Domaines de trading'],
  ['get', '/trading/assets', 'Bourse / Crypto', 'Actifs disponibles'],
  ['get', '/trading/portfolio', 'Bourse / Crypto', 'Portefeuille virtuel'],
  ['post', '/trading/buy', 'Bourse / Crypto', 'Acheter'],
  ['post', '/trading/sell', 'Bourse / Crypto', 'Vendre'],
  ['post', '/trading/advance-year', 'Bourse / Crypto', 'Avancer d\'un an'],
  ['get', '/trading/leaderboard', 'Bourse / Crypto', 'Classement'],
  ['get', '/realestate/state', 'Immobilier', 'État de la partie'],
  ['post', '/realestate/start', 'Immobilier', 'Démarrer une partie'],
  ['get', '/realestate/listings', 'Immobilier', 'Annonces'],
  ['get', '/realestate/listings/{id}', 'Immobilier', 'Détail d\'une annonce'],
  ['post', '/realestate/listings/{id}/expertise', 'Immobilier', 'Commander une expertise'],
  ['post', '/realestate/purchase/preview', 'Immobilier', 'Simuler un achat'],
  ['post', '/realestate/purchase', 'Immobilier', 'Acheter un bien'],
  ['get', '/realestate/properties', 'Immobilier', 'Mes biens'],
  ['post', '/realestate/properties/{id}/pay-works', 'Immobilier', 'Payer des travaux'],
  ['post', '/realestate/properties/{id}/list', 'Immobilier', 'Mettre en location'],
  ['post', '/realestate/properties/{id}/reprice', 'Immobilier', 'Modifier le loyer'],
  ['get', '/realestate/properties/{id}/statements', 'Immobilier', 'Relevés du bien'],
  ['post', '/realestate/time/advance', 'Immobilier', 'Avancer d\'un mois'],
  ['get', '/realestate/summary', 'Immobilier', 'Bilan du mois'],
  ['post', '/realestate/properties/{id}/gli', 'Immobilier', 'Activer/désactiver l\'assurance loyers impayés'],
  ['post', '/realestate/properties/{id}/landlord-notice', 'Immobilier', 'Donner congé au locataire'],
  ['get', '/realestate/events', 'Immobilier', 'Événements'],
  ['post', '/realestate/properties/{id}/sell', 'Immobilier', 'Mettre un bien en vente'],
  ['get', '/realestate/properties/{id}/sell/options', 'Immobilier', 'Options de prix de vente'],
  ['post', '/realestate/properties/{id}/sell/reprice', 'Immobilier', 'Modifier le prix de vente'],
  ['get', '/realestate/properties/{id}/renovate/preview', 'Immobilier', 'Devis de rénovation énergétique'],
  ['post', '/realestate/properties/{id}/renovate', 'Immobilier', 'Lancer la rénovation'],
  ['post', '/realestate/distress/sell', 'Immobilier', 'Vente en difficulté'],
  ['get', '/realestate/sales', 'Immobilier', 'Historique des ventes'],
  ['get', '/realestate/leaderboard', 'Immobilier', 'Classement'],
  ['get', '/bank/overview', 'Banque', 'Vue d\'ensemble (prêts, plafonds, blocage)'],
  ['get', '/bank/events', 'Banque', 'Événements bancaires récents'],
  ['post', '/bank/personal/quote', 'Banque', 'Devis de prêt personnel'],
  ['post', '/bank/personal/borrow', 'Banque', 'Emprunter (prêt personnel)'],
  ['post', '/bank/portfolio/quote', 'Banque', 'Devis de prêt sur portefeuille'],
  ['post', '/bank/portfolio/borrow', 'Banque', 'Emprunter sur portefeuille'],
  ['post', '/bank/portfolio/loans/{id}/repay', 'Banque', 'Rembourser un prêt sur portefeuille'],
  ['post', '/bank/recovery/preview', 'Banque', 'Aperçu de la procédure de rétablissement'],
  ['post', '/bank/recovery/start', 'Banque', 'Lancer la procédure de rétablissement (RETABLISSEMENT)'],
  ['post', '/bank/loans/{id}/repay', 'Banque', 'Rembourser un prêt'],
  ['get', '/bank/admin/stats', 'Banque', 'Statistiques admin de la banque', 'admin'],
];

export const buildOpenApiSpec = () => {
  const paths: Record<string, any> = {};
  for (const [method, path, tag, summary, access] of ROUTES) {
    const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1], in: 'path', required: true, schema: { type: 'string' },
    }));
    const responses: Record<string, any> = { '200': { description: 'Succès' } };
    if (access !== 'public') responses['401'] = { description: 'Jeton absent ou invalide' };
    if (access === 'admin') responses['403'] = { description: 'Réservé aux administrateurs avec 2FA' };
    paths[`/api/v1${path}`] = {
      ...paths[`/api/v1${path}`],
      [method]: {
        tags: [tag],
        summary,
        ...(params.length ? { parameters: params } : {}),
        ...(access === 'public' ? { security: [] } : {}),
        responses,
      },
    };
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'InvestKit API',
      version: '1.0.0',
      description: 'API de la plateforme InvestKit. Les pièces (🪙) sont une monnaie de jeu : ni boutique, ni retrait, ni achat en argent réel.',
    },
    servers: [{ url: '/' }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    paths,
  };
};
