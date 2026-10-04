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
  zones: string[];            // zones de prix : arrondissements (= codes), ou codes postaux de la ville
}

// Codes postaux de chaque ville hors Paris, Lyon et Marseille (qui restent découpées par arrondissement). Une zone = un code postal.
// [connu, à vérifier au premier rapport] : immo:zones-report liste les codes postaux réellement trouvés et signale tout code absent de cette liste ; une vente dont le code postal est inconnu ne sert qu'à la médiane de la ville.
const POSTAL: Record<string, string[]> = {
  bordeaux: ['33000', '33100', '33200', '33300', '33800'],
  toulouse: ['31000', '31100', '31200', '31300', '31400', '31500'],
  nantes: ['44000', '44100', '44200', '44300'],
  lille: ['59000', '59160', '59260', '59800'],
  montpellier: ['34000', '34070', '34080', '34090'],
  nice: ['06000', '06100', '06200', '06300'],
  rennes: ['35000', '35200', '35700'],
  dijon: ['21000'],
  'saint-etienne': ['42000', '42100', '42230'],
};

const range = (start: number, n: number): string[] => Array.from({ length: n }, (_, i) => String(start + i));

export const DVF_CITIES: readonly DvfCity[] = [
  { id: 'paris', name: 'Paris', department: '75', kind: 'metropole', codes: range(75101, 20), districts: true, zones: [] },
  { id: 'lyon', name: 'Lyon', department: '69', kind: 'metropole', codes: range(69381, 9), districts: true, zones: [] },
  { id: 'marseille', name: 'Marseille', department: '13', kind: 'metropole', codes: range(13201, 16), districts: true, zones: [] },
  { id: 'bordeaux', name: 'Bordeaux', department: '33', kind: 'grande', codes: ['33063'], districts: false, zones: POSTAL['bordeaux'] },
  { id: 'toulouse', name: 'Toulouse', department: '31', kind: 'grande', codes: ['31555'], districts: false, zones: POSTAL['toulouse'] },
  { id: 'nantes', name: 'Nantes', department: '44', kind: 'grande', codes: ['44109'], districts: false, zones: POSTAL['nantes'] },
  { id: 'lille', name: 'Lille', department: '59', kind: 'grande', codes: ['59350'], districts: false, zones: POSTAL['lille'] },
  { id: 'montpellier', name: 'Montpellier', department: '34', kind: 'grande', codes: ['34172'], districts: false, zones: POSTAL['montpellier'] },
  { id: 'nice', name: 'Nice', department: '06', kind: 'grande', codes: ['06088'], districts: false, zones: POSTAL['nice'] },
  { id: 'rennes', name: 'Rennes', department: '35', kind: 'moyenne', codes: ['35238'], districts: false, zones: POSTAL['rennes'] },
  { id: 'dijon', name: 'Dijon', department: '21', kind: 'moyenne', codes: ['21231'], districts: false, zones: POSTAL['dijon'] },
  { id: 'saint-etienne', name: 'Saint-Étienne', department: '42', kind: 'petite', codes: ['42218'], districts: false, zones: POSTAL['saint-etienne'] },
];

// Arrondissements : la zone est l'arrondissement lui-même.
for (const c of DVF_CITIES) if (c.districts) c.zones = [...c.codes];

const CITY_BY_CODE = new Map<string, DvfCity>(DVF_CITIES.flatMap((c) => c.codes.map((code) => [code, c] as const)));
// Recherche en une opération (appelée pour chaque vente : 1,2 million de fois).
export const cityOfCode = (code: string): DvfCity | undefined => CITY_BY_CODE.get(code);
const CITY_BY_ZONE = new Map<string, DvfCity>(DVF_CITIES.flatMap((c) => c.zones.map((z) => [z, c] as const)));
export const cityOfZone = (zone: string): DvfCity | undefined => CITY_BY_ZONE.get(zone);
export const allZones = (): string[] => DVF_CITIES.flatMap((c) => c.zones);
// Zone d'une vente : l'arrondissement (Paris, Lyon, Marseille), sinon le code postal s'il est connu pour la ville ; sinon '' (la vente ne sert alors qu'à la médiane de la ville).
export const zoneOf = (code: string, postal: string): string => {
  const city = CITY_BY_CODE.get(code);
  if (!city) return '';
  if (city.districts) return code;
  return city.zones.includes(postal) ? postal : '';
};
export const allCodes = (): string[] => DVF_CITIES.flatMap((c) => c.codes);

export const DVF_FIRST_YEAR = 2014;
// Fichier par commune et par année (DVF géolocalisées, DGFiP via data.gouv.fr, Licence Ouverte 2.0). [connu, à vérifier au premier téléchargement]
export const dvfUrl = (year: number, code: string, department = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2)): string =>
  `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${department}/${code}.csv`;

const ORDINAL = (n: number): string => (n === 1 ? '1er' : `${n}e`);
// Accepte un code de zone (arrondissement ou code postal) ou un code commune : « Paris 11e », « Bordeaux 33000 », « Bordeaux ». JAMAIS une rue ni un numéro.
export const zoneLabel = (code: string): string | null => {
  const zoneCity = cityOfZone(code);
  if (zoneCity) return zoneCity.districts ? `${zoneCity.name} ${ORDINAL(zoneCity.codes.indexOf(code) + 1)}` : `${zoneCity.name} ${code}`;
  return cityOfCode(code)?.name ?? null;
};
