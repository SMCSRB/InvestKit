import Stripe from 'stripe';
import { env } from '../config/env';

let stripeClient: Stripe | null = null;

// Le client n'est instancié qu'à la première utilisation : permet au
// serveur de démarrer même sans clé Stripe configurée (dev/tests), et
// ne lève une erreur claire que si on essaie vraiment de s'en servir.
export const getStripeClient = (): Stripe => {
  if (stripeClient) return stripeClient;

  if (!env.stripe.secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY manquant : configurez-le dans backend/.env.local pour activer les paiements'
    );
  }

  // Pas d'apiVersion forcée : utilise la version par défaut du SDK installé
  stripeClient = new Stripe(env.stripe.secretKey);

  return stripeClient;
};
