// Hypothèses de référence des simulateurs. VALEUR DE RÉFÉRENCE, NON SOURCÉE ICI, À RECONFIRMER sur les sources officielles
// (impots.gouv.fr, service-public.fr, Banque de France) avant toute décision réelle : les taux et seuils fiscaux changent d'une année à l'autre.
// Tout ce qui est ici est AFFICHÉ et modifiable dans l'interface : un simulateur ne cache jamais ses hypothèses.
export const SIM_RULES = {
  // Prélèvements sociaux sur les gains (taux en vigueur à la rédaction, à reconfirmer).
  socialLevyPct: 17.2,
  // Impôt sur les gains hors PEA (prélèvement forfaitaire : part « impôt sur le revenu »).
  flatIncomeTaxPct: 12.8,
  // PEA : après 5 ans, seuls les prélèvements sociaux s'appliquent sur les gains ; avant, imposition comme un compte-titres (et clôture du plan).
  peaYears: 5,
  // Frais de notaire (achat) : ordre de grandeur, à remplacer par ton devis.
  notaryOldPct: 7.5,
  notaryNewPct: 2.5,
  // Ratio d'endettement maximal conseillé par les banques (recommandation du HCSF).
  maxDebtRatioPct: 35,
  // Micro-foncier : abattement forfaitaire et plafond de loyers annuels.
  microFoncierAllowancePct: 30,
  microFoncierCeiling: 15000,
  // LMNP micro-BIC (meublé classique) : abattement forfaitaire et plafond de recettes.
  microBicAllowancePct: 50,
  microBicCeiling: 77700,
};

export const TMI_OPTIONS = [0, 11, 30, 41, 45];
