// Formats des fichiers DVF. Deux familles :
//  - « etalab » : DVF géolocalisées / DVF Etalab (colonnes id_mutation, date_mutation ISO, code_commune sur 5 caractères, séparateur virgule) ;
//  - « brut » : fichier d'origine de la DGFiP (valeursfoncieres-AAAA.txt : séparateur « | », date JJ/MM/AAAA, virgule décimale, code commune sur 3 chiffres + département, pas d'identifiant de mutation).
// Tout est ramené à un format STANDARD (mêmes noms que « etalab »), ce qui laisse le nettoyage et l'agrégation inchangés.
export type DvfFormat = 'etalab' | 'brut';

export const canonHeader = (h: string): string =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const ALIASES: Record<string, string> = {
  no_disposition: 'numero_disposition', numero_de_disposition: 'numero_disposition',
  nombre_de_lots: 'nombre_lots', code_departement: 'code_departement', departement: 'code_departement',
  surface_reelle_du_bati: 'surface_reelle_bati', nombre_de_pieces_principales: 'nombre_pieces_principales',
  no_plan: 'no_plan', prefixe_de_section: 'prefixe_de_section',
};

export const REQUIRED = ['date_mutation', 'nature_mutation', 'valeur_fonciere', 'code_commune', 'type_local', 'surface_reelle_bati'] as const;

export const canonHeaders = (header: string[]): string[] => header.map((h) => { const c = canonHeader(h); return ALIASES[c] ?? c; });

export interface FormatInfo { format: DvfFormat; missing: string[]; columns: string[] }
export const detectFormat = (header: string[]): FormatInfo => {
  const columns = canonHeaders(header);
  const missing: string[] = REQUIRED.filter((c) => !columns.includes(c));
  const format: DvfFormat = columns.includes('id_mutation') ? 'etalab' : 'brut';
  if (format === 'brut' && !columns.includes('code_departement') && columns.includes('code_commune')) missing.push('code_departement');
  return { format, missing: [...new Set(missing)], columns };
};

export class FormatError extends Error {
  constructor(message: string, readonly columns: string[]) { super(message); this.name = 'FormatError'; }
}

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// Types de local conservés sous leur nom standard ; tout le reste (terrains) devient « ».
export const canonType = (t: string): string => {
  const s = stripAccents(t).toLowerCase().trim();
  if (s === 'appartement') return 'Appartement';
  if (s === 'maison') return 'Maison';
  if (s === 'dependance') return 'Dépendance';
  if (s.startsWith('local')) return 'Local industriel. commercial ou assimilé';
  return '';
};

export const isoDate = (s: string): string => {
  const t = s.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : t.slice(0, 10);
};

export const code5 = (code: string, dep: string | undefined, format: DvfFormat): string => {
  const c = code.trim();
  if (format === 'brut') return `${(dep ?? '').trim().padStart(2, '0')}${c.padStart(3, '0')}`;
  return c.length >= 5 ? c : c.padStart(5, '0');
};

// Code postal sur 5 chiffres (« 6000 » -> « 06000 ») ; toute autre valeur devient « » (la vente n'aura alors pas de zone fine).
export const postal = (v: string): string => { const t = v.trim().replace(/\.0+$/, ''); return /^\d{4,5}$/.test(t) ? t.padStart(5, '0') : ''; };

export const STANDARD_COLUMNS = ['id_mutation', 'date_mutation', 'nature_mutation', 'valeur_fonciere', 'code_commune', 'code_postal', 'id_parcelle', 'nombre_lots', 'type_local', 'surface_reelle_bati', 'nombre_pieces_principales', 'longitude', 'latitude'] as const;

export const makeStandardizer = (header: string[]) => {
  const info = detectFormat(header);
  if (info.missing.length) throw new FormatError(`Colonnes indispensables absentes : ${info.missing.join(', ')}. Colonnes trouvées : ${info.columns.join(', ')}`, info.columns);
  const idx = new Map(info.columns.map((c, i) => [c, i] as const));
  const get = (r: string[], c: string): string => { const i = idx.get(c); return i === undefined ? '' : (r[i] ?? '').trim(); };
  const format = info.format;
  const standardize = (r: string[]): Record<string, string> => {
    const code = code5(get(r, 'code_commune'), get(r, 'code_departement'), format);
    const date = isoDate(get(r, 'date_mutation'));
    const value = get(r, 'valeur_fonciere');
    // Le fichier brut n'a pas d'identifiant de mutation : on regroupe sur date + commune + valeur (deux ventes distinctes au même prix le même jour sont rejetées plus tard comme « plusieurs logements », sans erreur).
    const id = format === 'etalab' ? get(r, 'id_mutation') : `${date}|${code}|${value}`;
    const parcel = format === 'etalab' ? get(r, 'id_parcelle') : `${code}|${get(r, 'prefixe_de_section')}|${get(r, 'section')}|${get(r, 'no_plan')}`;
    return {
      id_mutation: id, date_mutation: date, nature_mutation: get(r, 'nature_mutation'), valeur_fonciere: value, code_commune: code, code_postal: postal(get(r, 'code_postal')), id_parcelle: parcel,
      nombre_lots: get(r, 'nombre_lots'), type_local: canonType(get(r, 'type_local')), surface_reelle_bati: get(r, 'surface_reelle_bati'),
      nombre_pieces_principales: get(r, 'nombre_pieces_principales'), longitude: get(r, 'longitude'), latitude: get(r, 'latitude'),
    };
  };
  return { format, standardize, columns: info.columns };
};
