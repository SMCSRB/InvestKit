import { hasProAccess } from '../utils/entitlements';
import { subscriptionRepository } from '../repositories/subscriptionRepository';

// Statut d'abonnement affiché au joueur. TOUT vient du serveur (abonnement Stripe ou passage Pro manuel) : rien ne dépend d'une valeur
// enregistrée dans le navigateur, donc rien ne peut être « modifié côté client » pour se faire passer pour Pro.
export type PlanSource = 'subscription' | 'manual' | 'none';
export interface PlanInfo {
  isPro: boolean;
  source: PlanSource;
  renewsAt: string | null;   // prochain renouvellement (abonnement actif qui se renouvelle)
  endsAt: string | null;     // fin d'accès (abonnement résilié : Pro jusqu'à cette date)
}

interface PlanUser { id: string; subscription_tier: string; pro_override?: boolean; free_domain?: string | null }

const iso = (d: unknown): string | null => (d ? new Date(d as string | Date).toISOString() : null);

export const planService = {
  async planOf(user: PlanUser): Promise<PlanInfo> {
    if (!hasProAccess(user)) return { isPro: false, source: 'none', renewsAt: null, endsAt: null };
    const sub = await subscriptionRepository.findActiveByUserId(user.id);
    if (sub && user.subscription_tier === 'pro') {
      const end = iso(sub.current_period_end);
      // Un abonnement résilié reste actif jusqu'à la fin de la période payée : on affiche alors une date de FIN, pas de renouvellement.
      return sub.canceled_at ? { isPro: true, source: 'subscription', renewsAt: null, endsAt: end } : { isPro: true, source: 'subscription', renewsAt: end, endsAt: null };
    }
    if (user.subscription_tier === 'pro') return { isPro: true, source: 'subscription', renewsAt: null, endsAt: null };
    return { isPro: true, source: 'manual', renewsAt: null, endsAt: null };   // accordé à la main (testeurs) : pas de date
  },
};
