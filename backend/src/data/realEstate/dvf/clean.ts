// Nettoyage des DVF géolocalisées (fonctions pures : aucun accès réseau, disque ni base).
// Une ligne du fichier = un « local » d'une mutation (vente) ; la valeur foncière est répétée sur chaque ligne de la mutation.
// On ne garde que les ventes SIMPLES : un seul logement (appartement ou maison), pas de vente en l'état futur d'achèvement, surface et prix plausibles.
export type DvfType = 'appartement' | 'maison';

export interface DvfSale {
  id: string;
  date: string;           // AAAA-MM-JJ
  code: string;           // commune ou arrondissement
  type: DvfType;
  surface: number;        // m² bâtis
  price: number;          // euros
  pricePerM2: number;
  rooms: number | null;
  lon: number | null;
  lat: number | null;
}

export type RejectReason = 'pas_une_vente' | 'vefa' | 'sans_logement' | 'plusieurs_logements' | 'date_invalide' | 'surface_invalide' | 'prix_invalide' | 'prix_m2_hors_bornes' | 'valeur_aberrante' | 'doublon';

export const BOUNDS = { minSurface: 9, maxSurface: 400, minPrice: 10_000, maxPrice: 20_000_000, minPerM2: 500, maxPerM2: 40_000, outlierLow: 0.35, outlierHigh: 3, outlierMinSales: 20 } as const;

// Lecteur CSV (guillemets, virgules et guillemets doublés dans les champs).
export const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
};

const num = (s: string | undefined): number | null => {
  if (s === undefined || s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const validDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export const median = (v: number[]): number => {
  const a = [...v].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
export const quantile = (v: number[], q: number): number => {
  const a = [...v].sort((x, y) => x - y);
  const pos = (a.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
};

export interface CleanResult { sales: DvfSale[]; rejected: Record<RejectReason, number>; mutations: number }
const emptyRejected = (): Record<RejectReason, number> => ({ pas_une_vente: 0, vefa: 0, sans_logement: 0, plusieurs_logements: 0, date_invalide: 0, surface_invalide: 0, prix_invalide: 0, prix_m2_hors_bornes: 0, valeur_aberrante: 0, doublon: 0 });

export const cleanRows = (rows: Record<string, string>[]): CleanResult => {
  const byMutation = new Map<string, Record<string, string>[]>();
  for (const r of rows) { const id = r.id_mutation; if (id) { const l = byMutation.get(id); if (l) l.push(r); else byMutation.set(id, [r]); } }
  const rejected = emptyRejected();
  const sales: DvfSale[] = [];
  const seen = new Set<string>();
  for (const [id, lines] of byMutation) {
    const nature = (lines[0].nature_mutation || '').toLowerCase();
    if (nature.includes('futur')) { rejected.vefa++; continue; }
    if (nature !== 'vente') { rejected.pas_une_vente++; continue; }
    const date = lines[0].date_mutation || '';
    if (!validDate(date)) { rejected.date_invalide++; continue; }
    // Lignes identiques (même lot lu deux fois) : un seul logement.
    const homes = [...new Map(lines.filter((l) => (l.type_local === 'Appartement' || l.type_local === 'Maison') && (num(l.surface_reelle_bati) ?? 0) > 0)
      .map((l) => [`${l.type_local}|${l.id_parcelle}|${l.surface_reelle_bati}|${l.nombre_pieces_principales}|${l.nombre_lots}`, l])).values()];
    if (homes.length === 0) { rejected.sans_logement++; continue; }
    if (homes.length > 1) { rejected.plusieurs_logements++; continue; }
    const h = homes[0];
    const surface = num(h.surface_reelle_bati)!;
    if (surface < BOUNDS.minSurface || surface > BOUNDS.maxSurface) { rejected.surface_invalide++; continue; }
    const price = num(lines[0].valeur_fonciere);
    if (price === null || price < BOUNDS.minPrice || price > BOUNDS.maxPrice) { rejected.prix_invalide++; continue; }
    const pricePerM2 = price / surface;
    if (pricePerM2 < BOUNDS.minPerM2 || pricePerM2 > BOUNDS.maxPerM2) { rejected.prix_m2_hors_bornes++; continue; }
    // Le même acte peut apparaître dans deux fichiers (même identifiant) ou deux fois : on ne compte qu'une vente.
    const key = `${id}|${h.id_parcelle || ''}|${surface}`;
    if (seen.has(key)) { rejected.doublon++; continue; }
    seen.add(key);
    sales.push({
      id, date, code: h.code_commune, type: h.type_local === 'Appartement' ? 'appartement' : 'maison', surface, price: Math.round(price), pricePerM2: Math.round(pricePerM2 * 100) / 100,
      rooms: num(h.nombre_pieces_principales), lon: num(h.longitude), lat: num(h.latitude),
    });
  }
  return { sales, rejected, mutations: byMutation.size };
};

// Valeurs aberrantes : prix au m² trop loin de la médiane de SA commune, de SON type et de SON année (seulement quand il y a assez de ventes pour que la médiane soit fiable).
export const trimOutliers = (sales: DvfSale[]): { kept: DvfSale[]; removed: number } => {
  const groups = new Map<string, DvfSale[]>();
  for (const s of sales) { const k = `${s.code}|${s.type}|${s.date.slice(0, 4)}`; const l = groups.get(k); if (l) l.push(s); else groups.set(k, [s]); }
  const kept: DvfSale[] = []; let removed = 0;
  for (const list of groups.values()) {
    if (list.length < BOUNDS.outlierMinSales) { kept.push(...list); continue; }
    const m = median(list.map((s) => s.pricePerM2));
    for (const s of list) { if (s.pricePerM2 < m * BOUNDS.outlierLow || s.pricePerM2 > m * BOUNDS.outlierHigh) removed++; else kept.push(s); }
  }
  return { kept, removed };
};
