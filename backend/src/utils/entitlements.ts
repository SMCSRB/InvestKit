// Règles d'accès par abonnement (Phase 2A) - appliquées CÔTÉ SERVEUR.
//
// - Pro : tous les domaines.
// - Gratuit : uniquement le domaine gratuit choisi (une seule fois).
//   Tant qu'il n'est pas choisi, aucun achat n'est possible.
// - Seuls les NOUVEAUX ACHATS sont bloqués : un compte garde ses positions
//   dans un domaine verrouillé et peut toujours les vendre (jamais piéger
//   quelqu'un dans une position).

export interface EntitlementUser {
  subscription_tier: string;
  pro_override?: boolean;
  free_domain?: string | null;
}

export type BuyAccess =
  | { allowed: true }
  | { allowed: false; reason: 'FREE_DOMAIN_NOT_CHOSEN' | 'DOMAIN_LOCKED' };

// pro_override = passage manuel (testeurs) ; indépendant de Stripe pour
// qu'un webhook ne le supprime jamais.
export const hasProAccess = (user: EntitlementUser): boolean =>
  user.subscription_tier === 'pro' || user.pro_override === true;

export const getBuyAccess = (user: EntitlementUser, domainId: string): BuyAccess => {
  if (hasProAccess(user)) return { allowed: true };
  if (!user.free_domain) return { allowed: false, reason: 'FREE_DOMAIN_NOT_CHOSEN' };
  // Le nouveau domaine « crypto_market » (marché simulé) est débloqué par le domaine gratuit « crypto » : un joueur qui a choisi Crypto n'a pas à rechoisir.
  if ((domainId === 'crypto_market' && user.free_domain === 'crypto') || (domainId === 'crypto' && user.free_domain === 'crypto_market')) return { allowed: true };
  if (user.free_domain !== domainId) return { allowed: false, reason: 'DOMAIN_LOCKED' };
  return { allowed: true };
};
