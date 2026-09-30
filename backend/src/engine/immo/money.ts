// Utilitaires communs du moteur immobilier. Le moteur est PUR : aucune
// dépendance à la base, au réseau ou à l'horloge ; mêmes entrées = mêmes
// sorties. Tous les montants sont en euros, les taux en pourcents (3,5 = 3,5 %).

export class EngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineInputError';
  }
}

// Arrondi au centime (les banques arrondissent chaque échéance au centime).
export const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

export const assertFinite = (value: number, name: string): void => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EngineInputError(`${name} doit être un nombre fini (reçu : ${value})`);
  }
};

export const assertNonNegative = (value: number, name: string): void => {
  assertFinite(value, name);
  if (value < 0) throw new EngineInputError(`${name} ne peut pas être négatif (reçu : ${value})`);
};

export const assertPositiveInt = (value: number, name: string): void => {
  assertFinite(value, name);
  if (!Number.isInteger(value) || value < 1) {
    throw new EngineInputError(`${name} doit être un entier ≥ 1 (reçu : ${value})`);
  }
};

// Division sûre : renvoie null (« non calculable ») au lieu de Infinity/NaN.
export const safeDiv = (num: number, den: number): number | null =>
  den === 0 || !Number.isFinite(num / den) ? null : num / den;
