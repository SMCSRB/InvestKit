// Filtre en continu : lit un fichier DVF (national ou départemental, .csv ou .csv.gz, n'importe quel format reconnu), garde seulement les lignes utiles des codes demandés
// et les range dans un fichier par commune ou arrondissement. Le gros fichier n'est jamais stocké ni chargé en entier : il traverse le programme par morceaux.
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync, WriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import { AdaptiveDecoder, CsvStream } from './csv';
import { FormatError, makeStandardizer, STANDARD_COLUMNS, DvfFormat } from './format';

const KEPT_TYPES = new Set(['Appartement', 'Maison', 'Dépendance', 'Local industriel. commercial ou assimilé']);
const q = (v: string): string => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function* withFirst(first: Buffer, rest: AsyncIterator<Buffer>): AsyncGenerator<Buffer> {
  yield first;
  for (;;) { const n = await rest.next(); if (n.done) return; yield n.value; }
}

// Rend les octets utiles : décompresse si le flux commence par la signature gzip (on se fie au contenu, pas au nom).
export const openDvfStream = async (source: Readable): Promise<AsyncIterable<Buffer>> => {
  const it = source[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
  const first = await it.next();
  if (first.done) return (async function* () { /* vide */ })();
  const chunk = Buffer.from(first.value);
  const gz = chunk.length > 2 && chunk[0] === 0x1f && chunk[1] === 0x8b;
  const bytes = Readable.from(withFirst(chunk, it));
  return gz ? bytes.pipe(createGunzip()) : bytes;
};

export interface FilterResult { rowsRead: number; rowsKept: number; format: DvfFormat; perCode: Record<string, number>; written: string[] }

// Écrit dir/CODE.csv (via un fichier .part renommé à la fin : un téléchargement interrompu ne laisse jamais un fichier faux). Les fichiers déjà présents ne sont JAMAIS réécrits (codes absents de `wanted`).
export const filterToFiles = async (bytes: AsyncIterable<Buffer>, opts: { dir: string; wanted: Set<string>; yearOnly?: number }): Promise<FilterResult> => {
  mkdirSync(opts.dir, { recursive: true });
  const writers = new Map<string, WriteStream>();
  const perCode: Record<string, number> = {};
  for (const code of opts.wanted) { const w = createWriteStream(path.join(opts.dir, `${code}.csv.part`)); w.write(`${STANDARD_COLUMNS.join(',')}\n`); writers.set(code, w); perCode[code] = 0; }
  const cleanup = () => { for (const code of opts.wanted) { try { unlinkSync(path.join(opts.dir, `${code}.csv.part`)); } catch { /* absent */ } } };
  const csv = new CsvStream(); const decoder = new AdaptiveDecoder();
  const holder: { std: ReturnType<typeof makeStandardizer> | null } = { std: null };
  let rowsRead = 0; let rowsKept = 0;
  const handle = (records: string[][]) => {
    for (const r of records) {
      if (!holder.std) { holder.std = makeStandardizer(r); continue; }          // première ligne = en-tête (FormatError si indispensable absent)
      rowsRead++;
      const s = holder.std.standardize(r);
      const w = writers.get(s.code_commune);
      if (!w) continue;
      if (s.nature_mutation.toLowerCase() !== 'vente') continue;
      if (!KEPT_TYPES.has(s.type_local)) continue;
      if (opts.yearOnly && !s.date_mutation.startsWith(String(opts.yearOnly))) continue;
      w.write(`${STANDARD_COLUMNS.map((c) => q(s[c])).join(',')}\n`);
      perCode[s.code_commune]++; rowsKept++;
    }
  };
  try {
    for await (const raw of bytes) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      handle(csv.push(decoder.write(buf)));
    }
    handle(csv.push(decoder.end())); handle(csv.end());
    if (!holder.std) throw new FormatError('Fichier vide ou sans en-tête', []);
  } catch (e) {
    // On ferme proprement chaque fichier en cours avant de supprimer les .part (jamais d'écriture sur un flux détruit).
    await Promise.all([...writers.values()].map((w) => new Promise<void>((res) => { w.once('error', () => res()); w.end(() => res()); })));
    cleanup();
    throw e;
  }
  await Promise.all([...writers.values()].map((w) => new Promise<void>((res, rej) => { w.end(() => res()); w.on('error', rej); })));
  const written: string[] = [];
  for (const code of opts.wanted) {
    const part = path.join(opts.dir, `${code}.csv.part`); const final = path.join(opts.dir, `${code}.csv`);
    if (existsSync(final)) { unlinkSync(part); continue; }       // sécurité : jamais d'écrasement
    renameSync(part, final); written.push(code);
  }
  return { rowsRead, rowsKept, format: holder.std!.format, perCode, written };
};
