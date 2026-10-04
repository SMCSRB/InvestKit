// Frais de notaire RÉELS d'un achat dans l'ANCIEN, calculés par DÉPARTEMENT : droits de mutation (taux voté par le département) + émoluments du notaire (barème réglementé) + TVA sur les émoluments
// + contribution de sécurité immobilière + frais divers. Le NEUF reste à un taux forfaitaire (2 à 3 %, milieu de fourchette). Aucune valeur ci-dessous n'a pu être relue sur la page officielle depuis ma session :
// toutes sont marquées [à relire] dans docs/frais-notaire-fiche-source.md (lignes à relire par Andreja).

// Droits de mutation (DMTO) : taux global, en % du prix. [à relire : tableau officiel impots.gouv.fr « dmto_2026-02.pdf »]
export const DMTO_STANDARD_PCT = 5.80665;      // taux de base (département à 4,5 %)
export const DMTO_RAISED_PCT = 6.32;           // département à 5 % (hausse permise à partir du 1er avril 2025 pour 3 ans, loi de finances 2025)
// Départements restés à 4,5 % en 2026 (11 départements d'après un résumé de recherche) : Hautes-Alpes, Alpes-Maritimes, Ardèche, Charente, Drôme, Lozère, Oise, Hautes-Pyrénées, Saône-et-Loire, Guadeloupe, Mayotte.
export const DMTO_STAYED_STANDARD: readonly string[] = ['05', '06', '07', '16', '26', '48', '60', '65', '71', '971', '976'];
// Date d'entrée en vigueur de la hausse, par département, pour les 12 villes du jeu. Dates citées par un résumé de recherche (1er avril 2025 sauf Bouches-du-Rhône et Gironde : 1er mai 2025).
// Paris (75) et Nord (59) : date NON TROUVÉE ; on suppose le 1er avril 2025 (premier jour permis) : HYPOTHÈSE À RELIRE.
export const DMTO_RAISED_FROM: Readonly<Record<string, string>> = {
  '13': '2025-05-01', '21': '2025-04-01', '31': '2025-04-01', '33': '2025-05-01', '34': '2025-04-01', '35': '2025-04-01', '42': '2025-04-01', '44': '2025-04-01', '69': '2025-04-01',
  '75': '2025-04-01', '59': '2025-04-01',
};
export const DMTO_RAISED_FROM_DEFAULT = '2025-04-01';

// Émoluments proportionnels du notaire (barème réglementé, hors taxes), par tranche de prix. [connu, à relire : notaires.fr, Code de commerce art. A444-174]
export const EMOLUMENTS_BRACKETS: readonly { upTo: number; ratePct: number }[] = [
  { upTo: 6_500, ratePct: 3.870 }, { upTo: 17_000, ratePct: 1.596 }, { upTo: 60_000, ratePct: 1.064 }, { upTo: Infinity, ratePct: 0.799 },
];
export const NOTARY_VAT_PCT = 20;               // TVA sur les émoluments. [à relire]
export const CSI_PCT = 0.10;                    // contribution de sécurité immobilière, en % du prix. [à relire]
// Débours et formalités (frais divers payés pour le compte de l'acheteur) : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const NOTARY_MISC_EUR = 1_000;
// Neuf : taux forfaitaire (2 à 3 % d'après un résumé de recherche, milieu de fourchette). [à relire]
export const NOTARY_NEW_PCT = 2.5;
