// Indice de référence des loyers (IRL) RÉEL, Insee : série trimestrielle, base 100 au 4e trimestre 1998. [identifiant de série 001515333 d'après un résumé de recherche : à relire sur insee.fr]
// Décision d'Andreja (6 octobre 2026) : le moteur lit l'IRL RÉEL (table immo_irl) pour la révision annuelle des loyers ; la série fictive est supprimée. Sans IRL importé, AUCUNE révision n'a lieu (jamais de valeur inventée).
export const IRL_ENABLED = true;
export const IRL_SOURCE_ID = 'insee';
export const IRL_SERIES_ID = '001515333';
export const IRL_ATTRIBUTION = 'Indice de référence des loyers (IRL) : Insee, série 001515333 (Licence Ouverte).';

// Publication : l'Insee publie l'IRL à la mi-mois suivant la fin du trimestre (janvier, avril, juillet, octobre). Une valeur n'est donc utilisable qu'à partir du jour IRL_PUBLICATION_DAY du mois suivant son trimestre.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : le jour exact de publication varie d'un trimestre à l'autre ; 16 est volontairement prudent (jamais une valeur avant sa publication). À remplacer par les vraies dates si Andreja les fournit.
export const IRL_PUBLICATION_DAY = 16;

// Garde-fous techniques (pas des données) : un fichier hors de ces bornes est refusé.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const IRL_BOUNDS = { minValue: 100, maxValue: 400, maxQuarterlyChangePct: 4, minQuarters: 8 } as const;

// Bouclier loyers : de juillet 2022 à juin 2024, la hausse d'un loyer révisé était plafonnée à 3,5 % (métropole ; les 12 villes du jeu sont métropolitaines).
// [connu, à relire : service-public.gouv.fr, loi du 16 août 2022] ; simplification : granularité au MOIS (une révision de juillet 2022 est plafonnée même avant le 3 juillet).
export const IRL_SHIELD = { fromMonth: '2022-07', toMonth: '2024-06', capPct: 3.5 } as const;
