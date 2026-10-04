// Préparation des prix DVF : lecture des fichiers par quartier et par année, nettoyage, médianes glissantes, rapport. Utilisé par scripts/immo-import-dvf.ts.
// Aucun appel de fonction avec « ...tableau » sur un gros volume (voir arrays.ts) : 1,2 million de ventes passent sans problème.
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { readDvfText, cleanRows, trimOutliers, DvfSale, RejectReason } from './clean';
import { decodeText } from './csv';
import { monthlyMarket, qualityReport, MarketRow, QualityReport } from './aggregate';
import { pushAll } from './arrays';

export interface LoadedSales { sales: DvfSale[]; rejected: Partial<Record<RejectReason, number>>; files: number; mutations: number }

export const loadSalesFromDir = (dir: string): LoadedSales => {
  if (!existsSync(dir)) throw new Error(`Dossier introuvable : ${dir}. Lance d'abord « npm run immo:download-dvf ».`);
  const sales: DvfSale[] = []; const rejected: Partial<Record<RejectReason, number>> = {}; let files = 0; let mutations = 0;
  for (const year of readdirSync(dir).filter((d) => /^\d{4}$/.test(d)).sort()) {
    for (const f of readdirSync(path.join(dir, year)).filter((x) => x.endsWith('.csv'))) {
      const r = cleanRows(readDvfText(decodeText(readFileSync(path.join(dir, year, f)))).rows);   // tout format reconnu (virgule ou « | », UTF-8 ou latin1, virgule décimale)
      files++; mutations += r.mutations; pushAll(sales, r.sales);
      for (const [k, v] of Object.entries(r.rejected)) rejected[k as RejectReason] = (rejected[k as RejectReason] ?? 0) + v;
    }
  }
  if (!files) throw new Error('Aucun fichier .csv trouvé : rien n\'est écrit.');
  return { sales, rejected, files, mutations };
};

export interface Built { kept: DvfSale[]; rejected: Partial<Record<RejectReason, number>>; range: { from: string; to: string }; rows: MarketRow[]; report: QualityReport }

// Premier et dernier mois présents, par une seule passe (pas de tri de 1,2 million de chaînes).
export const monthBounds = (sales: readonly DvfSale[]): { first: string; last: string } => {
  let first = '9999-99'; let last = '0000-00';
  for (let i = 0; i < sales.length; i++) { const m = sales[i].date.slice(0, 7); if (m < first) first = m; if (m > last) last = m; }
  return { first, last };
};

export const buildFromSales = (sales: DvfSale[], rejectedIn: Partial<Record<RejectReason, number>>, opts: { from?: string; to?: string } = {}): Built => {
  const trimmed = trimOutliers(sales);
  const rejected = { ...rejectedIn, valeur_aberrante: (rejectedIn.valeur_aberrante ?? 0) + trimmed.removed };
  const { first, last } = monthBounds(trimmed.kept);
  const range = { from: opts.from ?? `${first.slice(0, 4)}-01`, to: opts.to ?? last };      // les années absentes ne produisent aucune ligne
  const rows = monthlyMarket(trimmed.kept, range);
  return { kept: trimmed.kept, rejected, range, rows, report: qualityReport(trimmed.kept, rows) };
};
