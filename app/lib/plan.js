// Statut d'abonnement : les données viennent du SERVEUR (/auth/me → user.plan). Ce fichier ne fait que les mettre en mots.
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// « Pro · renouvellement le 15 mars 2027 », « Pro · se termine le 1 décembre 2026 », « Pro accordé manuellement », « Plan gratuit ».
export const planLine = (plan) => {
  if (!plan?.isPro) return 'Plan gratuit';
  if (plan.source === 'manual') return 'Pro accordé manuellement';
  if (plan.endsAt) return `Pro · se termine le ${fmtDate(plan.endsAt)} (non renouvelé)`;
  if (plan.renewsAt) return `Pro · renouvellement le ${fmtDate(plan.renewsAt)}`;
  return 'Plan Pro';
};
