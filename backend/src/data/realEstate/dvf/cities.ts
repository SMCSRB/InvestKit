// Les 12 villes de départ décidées par Andreja (4 octobre 2026), avec leurs codes communes INSEE.
// Paris, Lyon et Marseille sont suivies par ARRONDISSEMENT (de vrais quartiers) ; les autres villes par commune.
// [connu, à vérifier au premier téléchargement] : le script de téléchargement signale tout fichier introuvable, ce qui trahirait un code erroné.
// Pas de Strasbourg, Metz ni Mulhouse : l'Alsace-Moselle n'est pas dans les données DVF.
export interface DvfCity {
  id: string;
  name: string;
  department: string;
  kind: 'metropole' | 'grande' | 'moyenne' | 'petite';
  codes: string[];            // codes communes (ou arrondissements) à télécharger
  districts: boolean;         // true : les codes sont des arrondissements
}

const range = (start: number, n: number): string[] => Array.from({ length: n }, (_, i) => String(start + i));

export const DVF_CITIES: readonly DvfCity[] = [
  { id: 'paris', name: 'Paris', department: '75', kind: 'metropole', codes: range(75101, 20), districts: true },
  { id: 'lyon', name: 'Lyon', department: '69', kind: 'metropole', codes: range(69381, 9), districts: true },
  { id: 'marseille', name: 'Marseille', department: '13', kind: 'metropole', codes: range(13201, 16), districts: true },
  { id: 'bordeaux', name: 'Bordeaux', department: '33', kind: 'grande', codes: ['33063'], districts: false },
  { id: 'toulouse', name: 'Toulouse', department: '31', kind: 'grande', codes: ['31555'], districts: false },
  { id: 'nantes', name: 'Nantes', department: '44', kind: 'grande', codes: ['44109'], districts: false },
  { id: 'lille', name: 'Lille', department: '59', kind: 'grande', codes: ['59350'], districts: false },
  { id: 'montpellier', name: 'Montpellier', department: '34', kind: 'grande', codes: ['34172'], districts: false },
  { id: 'nice', name: 'Nice', department: '06', kind: 'grande', codes: ['06088'], districts: false },
  { id: 'rennes', name: 'Rennes', department: '35', kind: 'moyenne', codes: ['35238'], districts: false },
  { id: 'dijon', name: 'Dijon', department: '21', kind: 'moyenne', codes: ['21231'], districts: false },
  { id: 'saint-etienne', name: 'Saint-Étienne', department: '42', kind: 'petite', codes: ['42218'], districts: false },
];

export const cityOfCode = (code: string): DvfCity | undefined => DVF_CITIES.find((c) => c.codes.includes(code));
export const allCodes = (): string[] => DVF_CITIES.flatMap((c) => c.codes);

export const DVF_FIRST_YEAR = 2014;
// Fichier par commune et par année (DVF géolocalisées, DGFiP via data.gouv.fr, Licence Ouverte 2.0). [connu, à vérifier au premier téléchargement]
export const dvfUrl = (year: number, code: string, department = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2)): string =>
  `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${department}/${code}.csv`;
