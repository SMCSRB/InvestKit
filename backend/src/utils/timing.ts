import { AUTH_MIN_RESPONSE_MS } from '../config/securityRules';

// Attend, si besoin, que la réponse ait duré AU MOINS la durée minimale : chemin « compte existant » et chemin « nouveau compte »
// prennent ainsi le même temps, et la durée ne sert pas à deviner si une adresse est inscrite.
export const padResponse = async (startedAt: number, minMs: number = AUTH_MIN_RESPONSE_MS): Promise<void> => {
  const wait = minMs - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
};
