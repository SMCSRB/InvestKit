// Rendement brut à partir de LOYERS RÉELS (carte des loyers) et de PRIX RÉELS (DVF). Fonction pure.
// Règle d'Andreja : une commune sans loyer ANIL n'a PAS de rentabilité affichée (null), jamais un loyer inventé ni un loyer de jeu.
export interface RentYieldInput { pricePerM2: number | null | undefined; rentPerM2: number | null | undefined }
export interface RentYield { grossYieldPct: number }
// Rendement brut annuel = loyer mensuel × 12 ÷ prix, sur un même m². Le loyer est un loyer d'ANNONCE, CHARGES COMPRISES : c'est un rendement brut indicatif, pas un rendement net.
export const realGrossYield = (i: RentYieldInput): RentYield | null => {
  const p = i.pricePerM2; const r = i.rentPerM2;
  if (typeof p !== 'number' || typeof r !== 'number' || !Number.isFinite(p) || !Number.isFinite(r) || p <= 0 || r <= 0) return null;
  return { grossYieldPct: Math.round(((r * 12) / p) * 10000) / 100 };
};
