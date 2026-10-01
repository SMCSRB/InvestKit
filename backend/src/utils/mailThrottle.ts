// Plafond d'envois automatiques par adresse e-mail (mémoire du processus, bornée) : empêche d'inonder la boîte de quelqu'un
// en rappelant « inscription » ou « mot de passe oublié » en boucle. Au redémarrage le compteur repart de zéro (acceptable ici).
const sent = new Map<string, number[]>();
const MAX_KEYS = 5000;

export const allowMail = (kind: string, address: string, max: number, windowMs: number, now = Date.now()): boolean => {
  const key = `${kind}:${address.trim().toLowerCase()}`;
  const recent = (sent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { sent.set(key, recent); return false; }
  recent.push(now);
  sent.delete(key); sent.set(key, recent); // ré-insère en fin : l'ordre d'insertion sert d'ancienneté
  if (sent.size > MAX_KEYS) sent.delete(sent.keys().next().value as string);
  return true;
};

export const resetMailThrottle = (): void => sent.clear();
