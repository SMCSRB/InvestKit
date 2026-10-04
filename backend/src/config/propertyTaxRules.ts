// Taxe foncière sur les propriétés bâties (TFB) au taux communal RÉEL. PRÉPARATION : le moteur actuel ne lit pas ce module (PROPERTY_TAX_ENABLED = false) ; le catalogue fictif garde sa taxe de jeu (taxPerSqm).
// Source visée : DGFiP, fichier « Taxe foncière par commune, taux et charge par local » (data.gouv.fr). Licence Ouverte 2.0 d'après un résumé de recherche : [à relire sur la page du jeu de données, voir docs/taxe-fonciere-fiche-source.md].
export const PROPERTY_TAX_ENABLED = false;
export const PROPERTY_TAX_SOURCE_ID = 'dgfip-rei';
export const PROPERTY_TAX_ATTRIBUTION = 'Taux de taxe foncière : DGFiP, fichiers des recensements des éléments d\'imposition (REI), via data.gouv.fr (Licence Ouverte 2.0, à reconfirmer).';
export const PROPERTY_TAX_BASE_NOTE = 'Taux communal réel ; base cadastrale ESTIMÉE (valeur de jeu), non celle du vrai bien.';

// Commune dont le taux s'applique à chaque ville : Paris, Lyon et Marseille sont VOTÉES à l'échelle de la commune, pas de l'arrondissement (codes communes entiers 75056, 69123, 13055).
// [connu, à vérifier au premier import : un code absent du fichier est signalé].
export const TAX_COMMUNE_BY_CITY: Readonly<Record<string, string>> = { paris: '75056', lyon: '69123', marseille: '13055' };

// Jour (MM-JJ) à partir duquel le taux d'une année est utilisable (règle « aucun futur » : les taux sont votés avant le 15 avril, mais les fichiers ne sortent qu'ensuite et l'avis d'imposition arrive à l'automne).
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : 1er octobre, volontairement prudent. Avant cette date de la première année importée : aucun taux, donc la taxe reste une valeur de jeu marquée.
export const TAX_RATE_USABLE_FROM = '10-01';

// BASE CADASTRALE : la base réelle (valeur locative cadastrale de 1970 revalorisée, réduite de 50 %) n'est pas publiée par bien. Estimation = surface × ce montant.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : 30 €/m² de base nette, la même pour toutes les villes (on n'invente pas de différence entre communes). Pas de revalorisation annuelle modélisée.
export const CADASTRAL_BASE_NET_EUR_PER_SQM = 30;

// Colonnes acceptées dans le fichier de la DGFiP (noms normalisés : minuscules, sans accents, tout signe remplacé par « _ »). [SUPPOSÉ, à confirmer au premier import : en cas de colonne introuvable, le script affiche les colonnes trouvées et refuse.]
export const REI_COLUMNS = {
  commune: ['code_commune', 'code_insee', 'insee', 'com', 'depcom', 'code_com', 'codgeo'],
  year: ['annee', 'exercice', 'millesime'],
  rate: ['taux_global_tfb', 'taux_tfb_global', 'taux_global_tfpb', 'taux_global_foncier_bati', 'taux_global_fb', 'taux_tfb'],
} as const;

// Garde-fous techniques (pas des données) : un taux hors de ces bornes (en %) est refusé. VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const PROPERTY_TAX_BOUNDS = { minRatePct: 5, maxRatePct: 200, firstYear: 2020 } as const;
