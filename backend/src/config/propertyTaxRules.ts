// Taxe foncière sur les propriétés bâties (TFB) au taux communal RÉEL. PRÉPARATION : le moteur actuel ne lit pas ce module (PROPERTY_TAX_ENABLED = false) ; le catalogue fictif garde sa taxe de jeu (taxPerSqm).
// Source retenue (trouvée et relue par Andreja, 6 octobre 2026) : data.gouv.fr, « Taxe foncière par commune, taux et charge par local, 2022 à 2025 », publié par TERRALYSE, Licence Ouverte 2.0, 5 206 communes. Attribution : « Source : Terralyse ».
// Le fichier sépare le taux communal, le taux intercommunal et la TEOM. Taux global de taxe foncière = commune + intercommunalité ; la TEOM (récupérable sur le locataire) reste À PART. La donnée brute de la DGFiP (source primaire) reste à vérifier, voir docs/taxe-fonciere-fiche-source.md.
export const PROPERTY_TAX_ENABLED = false;
export const PROPERTY_TAX_SOURCE_ID = 'terralyse';
export const PROPERTY_TAX_ATTRIBUTION = 'Source : Terralyse';
export const PROPERTY_TAX_LICENCE = 'Licence Ouverte 2.0';
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

// Colonnes acceptées dans le fichier (noms normalisés : minuscules, sans accents, tout signe remplacé par « _ »). [NOMS SUPPOSÉS, à confirmer au premier import : le fichier n'a pas pu être ouvert depuis ma session. En cas de colonne introuvable, le script affiche les colonnes trouvées et refuse.]
export const REI_COLUMNS = {
  commune: ['code_commune', 'code_insee', 'insee', 'com', 'depcom', 'code_com', 'codgeo', 'code_geo'],
  year: ['annee', 'exercice', 'millesime'],
  communal: ['taux_commune', 'taux_communal', 'taux_tfb_commune', 'taux_tfb_communal', 'taux_foncier_bati_commune', 'taux_fb_commune', 'taux_commune_tfb', 'tfb_taux_commune', 'taux_com_tfb', 'taux_communal_tfb', 'taux_tfb_communal_bati'],
  intercommunal: ['taux_intercommunal', 'taux_intercommunalite', 'taux_epci', 'taux_tfb_epci', 'taux_tfb_intercommunal', 'taux_foncier_bati_epci', 'taux_fb_epci', 'taux_epci_tfb', 'taux_interco', 'taux_interco_tfb', 'taux_intercommunal_tfb', 'taux_intercommunalite_tfb', 'taux_tfb_intercommunalite', 'taux_epci_tfb_bati'],
  teom: ['taux_teom', 'teom_taux', 'taux_teom_commune', 'taux_ordures_menageres'],   // facultative : jamais ajoutée au taux global
} as const;

// Garde-fous techniques (pas des données) : un taux hors de ces bornes (en %) est refusé. VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
// Taux global = communal + intercommunal. Un taux intercommunal VIDE (commune sans taux d'intercommunalité, ex. Paris) compte 0 et est SIGNALÉ dans le rapport.
export const PROPERTY_TAX_BOUNDS = { minRatePct: 5, maxRatePct: 200, maxPartPct: 150, maxTeomPct: 60, firstYear: 2020 } as const;
