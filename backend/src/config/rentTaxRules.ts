// Fiscalité des REVENUS FONCIERS (location nue) : micro-foncier et régime réel. PRÉPARATION : le moteur actuel garde son calcul d'impôt simplifié (computeRentTax, un seul taux) ; il ne lit pas ce module (RENT_TAX_REGIMES_ENABLED = false).
// TOUS les chiffres ci-dessous viennent de MÉMOIRE ou de résumés de recherche : [à relire sur impots.gouv.fr / service-public.gouv.fr, voir docs/fiscalite-fonciere-fiche-source.md]. Aucun n'a pu être relu sur la page officielle (accès réseau bloqué).
export const RENT_TAX_REGIMES_ENABLED = false;

// Micro-foncier : abattement forfaitaire de 30 % des loyers bruts ; réservé aux revenus fonciers bruts annuels de 15 000 € au plus. Au-dessus : régime réel obligatoire.
// [connu, à relire] ; les autres cas d'exclusion du micro-foncier (biens en régimes spéciaux, etc.) ne sont PAS modélisés.
export const MICRO_FONCIER = { abatementPct: 30, ceilingEur: 15_000 } as const;

// Régime réel : déficit foncier. La part du déficit due aux charges autres que les intérêts d'emprunt s'impute sur le revenu global jusqu'à ce plafond ; le reste (dont tout le déficit dû aux intérêts) se reporte sur les revenus fonciers des 10 années suivantes.
// [connu, à relire] ; le plafond relevé pour certains travaux de rénovation énergétique n'est PAS modélisé.
export const REAL_REGIME = { deficitOnGlobalIncomeCeilingEur: 10_700, carryYears: 10 } as const;

// Prélèvements sociaux sur les revenus fonciers : repris de config/immoRules.ts (SOCIAL_CHARGES_ON_RENT_PCT = 17,2 %, [à relire]). Même base que l'impôt sur le revenu.
// L'impôt sur le revenu se calcule au taux de la tranche marginale du PROFIL (11 % ou 30 %) : c'est un CHOIX DE JEU (config/immoRules.ts), pas le barème exact. La CSG déductible (6,8 %) et le quotient familial ne sont pas modélisés.
// L'engagement de trois ans au régime réel n'est PAS modélisé : la comparaison des deux régimes est indicative.
