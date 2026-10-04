// Indice de référence des loyers (IRL) RÉEL, Insee : série trimestrielle, base 100 au 4e trimestre 1998. [identifiant de série 001515333 d'après un résumé de recherche : à relire sur insee.fr]
// TANT QUE CETTE VALEUR EST FAUSSE, rien dans le moteur actuel ne lit l'IRL réel : le catalogue fictif garde sa série fictive (voir docs/loyers-irl-fiche-source.md).
export const IRL_ENABLED = false;
export const IRL_SOURCE_ID = 'insee';
export const IRL_SERIES_ID = '001515333';
export const IRL_ATTRIBUTION = 'Indice de référence des loyers (IRL) : Insee, série 001515333 (Licence Ouverte).';

// Publication : l'Insee publie l'IRL à la mi-mois suivant la fin du trimestre (janvier, avril, juillet, octobre). Une valeur n'est donc utilisable qu'à partir du jour IRL_PUBLICATION_DAY du mois suivant son trimestre.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : le jour exact de publication varie d'un trimestre à l'autre ; 16 est volontairement prudent (jamais une valeur avant sa publication). À remplacer par les vraies dates si Andreja les fournit.
export const IRL_PUBLICATION_DAY = 16;

// Garde-fous techniques (pas des données) : un fichier hors de ces bornes est refusé.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const IRL_BOUNDS = { minValue: 100, maxValue: 400, maxQuarterlyChangePct: 4, minQuarters: 8 } as const;
