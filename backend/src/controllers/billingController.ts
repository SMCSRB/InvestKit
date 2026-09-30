import { Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth';
import { getStripeClient } from '../utils/stripe';
import { env } from '../config/env';
import { grantProStartingCapitalTx } from '../services/verificationService';
import { userRepository } from '../repositories/userRepository';
import { subscriptionRepository } from '../repositories/subscriptionRepository';

// Un abonnement est considéré "payant" tant que Stripe le dit actif ou en
// période d'essai ; tout le reste (annulé, impayé, expiré...) repasse en free.
const isPaidStatus = (status: Stripe.Subscription.Status): boolean =>
  status === 'active' || status === 'trialing';

const getOrCreateStripeCustomerId = async (
  userId: string,
  email: string
): Promise<string> => {
  const user = await userRepository.findById(userId);
  if (user?.stripe_customer_id) return user.stripe_customer_id;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await userRepository.setStripeCustomerId(userId, customer.id);
  return customer.id;
};

// Synchronise l'état d'un abonnement Stripe vers notre base (appelé par les
// webhooks checkout.session.completed / customer.subscription.updated|deleted).
const syncSubscriptionFromStripe = async (subscription: Stripe.Subscription) => {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const user = await userRepository.findByStripeCustomerId(customerId);
  if (!user) {
    console.error(`Webhook Stripe: aucun utilisateur pour le customer ${customerId}`);
    return;
  }

  const tier = isPaidStatus(subscription.status) ? 'pro' : 'free';

  // Depuis les API Stripe récentes, current_period_end vit sur chaque
  // ligne d'abonnement (items) plutôt que sur l'abonnement lui-même.
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  await subscriptionRepository.upsertByExternalId({
    user_id: user.id,
    tier,
    status: subscription.status,
    payment_provider: 'stripe',
    external_subscription_id: subscription.id,
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
  });

  await userRepository.setSubscriptionTier(user.id, tier);
  // Complément de capital de départ : une seule fois par compte (voir grantProStartingCapital).
  if (tier === 'pro') await grantProStartingCapitalTx(user.id);
};

export const billingController = {
  // Crée une session Stripe Checkout pour souscrire au plan Pro (mensuel ou annuel)
  createCheckoutSession: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { plan } = req.body; // 'monthly' | 'yearly'
      const priceId = plan === 'yearly' ? env.stripe.priceIdYearly : env.stripe.priceIdMonthly;

      if (!priceId) {
        res.status(500).json({
          error: `STRIPE_PRICE_ID_${plan === 'yearly' ? 'YEARLY' : 'MONTHLY'} non configuré`,
        });
        return;
      }

      const customerId = await getOrCreateStripeCustomerId(req.user.userId, req.user.email);
      const stripe = getStripeClient();

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        payment_method_types: ['card', 'sepa_debit'],
        success_url: `${env.frontendUrl}/dashboard?checkout=success`,
        cancel_url: `${env.frontendUrl}/dashboard?checkout=canceled`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
    }
  },

  // Redirige l'utilisateur vers le portail Stripe (gérer/annuler son abonnement)
  createPortalSession: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user?.stripe_customer_id) {
        res.status(400).json({ error: 'Aucun abonnement associé à ce compte' });
        return;
      }

      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${env.frontendUrl}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Create portal session error:', error);
      res.status(500).json({ error: 'Erreur lors de la création du portail de facturation' });
    }
  },

  // Webhook Stripe - reçoit tous les événements liés au cycle de vie de
  // l'abonnement. Route montée AVANT express.json() (voir index.ts) car la
  // vérification de signature exige le corps brut, non parsé.
  webhook: async (req: AuthRequest, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'];

    if (!signature || !env.stripe.webhookSecret) {
      res.status(400).json({ error: 'Signature ou secret webhook manquant' });
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(req.body, signature, env.stripe.webhookSecret);
    } catch (error: any) {
      console.error('❌ Signature webhook Stripe invalide:', error.message);
      res.status(400).json({ error: `Webhook invalide: ${error.message}` });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.subscription) {
            const stripe = getStripeClient();
            const subscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription.id;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await syncSubscriptionFromStripe(subscription);
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await syncSubscriptionFromStripe(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          console.warn(`⚠️ Paiement échoué pour le client Stripe ${invoice.customer}`);
          break;
        }

        default:
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Erreur lors du traitement du webhook' });
    }
  },
};
