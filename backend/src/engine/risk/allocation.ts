import { ASSET_CLASSES, AssetClass } from '../../config/riskRules';
import { RiskInputError } from './monteCarlo';

// Répartition par classe d'actifs : des montants OU des pourcentages (quelconque échelle) ; normalisée en poids (somme = 1).
export type Allocation = Partial<Record<AssetClass, number>>;

export const normalizeAllocation = (raw: unknown): Record<AssetClass, number> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RiskInputError('Répartition invalide : objet { classe: montant } attendu');
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  let total = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!(ASSET_CLASSES as string[]).includes(k)) throw new RiskInputError(`Classe d'actifs inconnue : ${k.slice(0, 30)}`);
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e12) throw new RiskInputError(`Montant invalide pour ${k}`);
    out[k as AssetClass] = v; total += v;
  }
  if (total <= 0) throw new RiskInputError('La répartition est vide : au moins une classe doit être positive');
  for (const c of ASSET_CLASSES) out[c] = out[c] / total;
  return out;
};
