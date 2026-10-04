// Adresses essayées pour télécharger les DVF. RIEN n'est deviné : chaque adresse est essayée, son résultat exact (code HTTP ou erreur réseau) va dans le rapport, et une adresse qui ne répond pas est listée « à vérifier ».
// Confirmé par Andreja sur le serveur : l'adresse « par commune » n'existe que pour 2021 et 2022 (HTTP 404 de 2014 à 2020).
// Les autres adresses sont des hypothèses [à vérifier] : on les essaie dans l'ordre, la première qui répond est utilisée. On peut aussi imposer une adresse exacte avec --url (modèle avec {year}, {dep}, {code}).
export type SourceScope = 'commune' | 'departement' | 'national';
export interface DvfSource { id: string; scope: SourceScope; label: string; confirmed: boolean; url: (p: { year: number; dep: string; code: string }) => string }

const GEO = 'https://files.data.gouv.fr/geo-dvf/latest/csv';
const CADASTRE = 'https://cadastre.data.gouv.fr/data/etalab-dvf/latest/csv';

export const DEFAULT_SOURCES: readonly DvfSource[] = [
  { id: 'geo-commune', scope: 'commune', label: 'DVF géolocalisées, un fichier par commune (confirmé pour 2021 et 2022)', confirmed: true, url: ({ year, dep, code }) => `${GEO}/${year}/communes/${dep}/${code}.csv` },
  { id: 'cadastre-departement', scope: 'departement', label: 'DVF Etalab (cadastre.data.gouv.fr), un fichier par département [à vérifier]', confirmed: false, url: ({ year, dep }) => `${CADASTRE}/${year}/departements/${dep}.csv.gz` },
  { id: 'geo-departement', scope: 'departement', label: 'DVF géolocalisées, un fichier par département [à vérifier]', confirmed: false, url: ({ year, dep }) => `${GEO}/${year}/departements/${dep}.csv.gz` },
  { id: 'cadastre-national', scope: 'national', label: 'DVF Etalab, fichier national de l\'année [à vérifier]', confirmed: false, url: ({ year }) => `${CADASTRE}/${year}/full.csv.gz` },
  { id: 'geo-national', scope: 'national', label: 'DVF géolocalisées, fichier national de l\'année [à vérifier]', confirmed: false, url: ({ year }) => `${GEO}/${year}/full.csv.gz` },
];

// Adresse imposée par l'utilisateur : le type (commune, département, national) se déduit des jetons présents dans le modèle.
export const customSource = (template: string): DvfSource => {
  const scope: SourceScope = template.includes('{code}') ? 'commune' : template.includes('{dep}') ? 'departement' : 'national';
  return { id: 'url-imposee', scope, label: `Adresse imposée : ${template}`, confirmed: false, url: ({ year, dep, code }) => template.replace(/\{year\}/g, String(year)).replace(/\{dep\}/g, dep).replace(/\{code\}/g, code) };
};
