// Téléchargement d'une année de DVF pour les codes voulus, avec un rapport clair de tout ce qui a été essayé.
// Stratégie par année : si tous les fichiers existent, on ne touche à rien ; sinon on essaie d'abord le fichier par commune (un seul essai-sonde : s'il est introuvable on passe à la suite),
// puis les fichiers départementaux, puis le fichier national. Le fichier volumineux n'est jamais enregistré : il est filtré au fil de l'eau (voir filter.ts).
import { existsSync } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { DvfSource } from './sources';
import { filterToFiles, openDvfStream } from './filter';
import { FormatError } from './format';

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; body: Readable | null }>;

export interface Attempt { url: string; scope: string; outcome: string; ok: boolean }
export interface YearReport {
  year: number;
  state: 'deja-present' | 'telecharge' | 'partiel' | 'echec';
  method: string | null;
  written: number;
  alreadyThere: number;
  rowsRead: number;
  rowsKept: number;
  attempts: Attempt[];
  missingCodes: string[];
  notes: string[];
}

const describeError = (e: unknown): string => {
  if (e instanceof FormatError) return `format non reconnu : ${e.message}`;
  const err = e as { message?: string; cause?: { code?: string; message?: string } };
  const cause = err?.cause?.code ?? err?.cause?.message;
  return `erreur réseau : ${err?.message ?? String(e)}${cause ? ` (${cause})` : ''}`;
};

export const realFetcher: Fetcher = async (url) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 60_000);     // délai de connexion seulement : un gros fichier peut ensuite arriver aussi longtemps qu'il faut
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'InvestKit-dvf-import (usage personnel, hors ligne)' } });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, body: res.ok && res.body ? Readable.fromWeb(res.body as never) : null };
  } catch (e) { clearTimeout(t); throw e; }
};

export interface YearOptions {
  year: number; dir: string;                         // dir = dossier de l'année
  codes: { code: string; dep: string }[];
  sources: readonly DvfSource[];
  fetcher: Fetcher;
  log?: (s: string) => void;
}

export const downloadYear = async (o: YearOptions): Promise<YearReport> => {
  const log = o.log ?? (() => undefined);
  const rep: YearReport = { year: o.year, state: 'echec', method: null, written: 0, alreadyThere: 0, rowsRead: 0, rowsKept: 0, attempts: [], missingCodes: [], notes: [] };
  const todo = o.codes.filter((c) => !existsSync(path.join(o.dir, `${c.code}.csv`)));
  rep.alreadyThere = o.codes.length - todo.length;
  if (!todo.length) { rep.state = 'deja-present'; return rep; }
  const wanted = new Set(todo.map((c) => c.code));
  const complete = () => todo.every((t) => existsSync(path.join(o.dir, `${t.code}.csv`)));
  const deps = [...new Set(todo.map((c) => c.dep))];
  const attempt = (url: string, scope: string, outcome: string, ok: boolean) => { rep.attempts.push({ url, scope, outcome, ok }); log(`  ${ok ? 'OK ' : 'NON'} ${url} → ${outcome}`); };
  const done = (method: string, written: string[], read: number, kept: number) => { rep.method = method; rep.written += written.length; rep.rowsRead += read; rep.rowsKept += kept; };

  // Les adresses imposées par l'utilisateur (--url) passent AVANT les adresses par défaut, quel que soit leur type.
  const groups: DvfSource[][] = [
    ...o.sources.filter((s) => s.id === 'url-imposee').map((s) => [s]),
    ...(['commune', 'departement', 'national'] as const).map((sc) => o.sources.filter((s) => s.id !== 'url-imposee' && s.scope === sc)),
  ];
  for (const sources of groups) {
    for (const src of sources) {
      const scope = src.scope;
      if (scope === 'commune') {
        // Sonde : le premier code manquant. Introuvable = on ne perd pas de temps sur les 53 autres.
        const probe = todo[0];
        const url0 = src.url({ year: o.year, dep: probe.dep, code: probe.code });
        let first: Awaited<ReturnType<Fetcher>>;
        try { first = await o.fetcher(url0); } catch (e) { attempt(url0, scope, describeError(e), false); continue; }
        if (!first.ok || !first.body) { attempt(url0, scope, `HTTP ${first.status}`, false); continue; }
        attempt(url0, scope, `HTTP ${first.status}`, true);
        let got = 0; let read = 0; let kept = 0;
        for (const c of todo) {
          const url = c === probe ? url0 : src.url({ year: o.year, dep: c.dep, code: c.code });
          try {
            const r = c === probe ? first : await o.fetcher(url);
            if (!r.ok || !r.body) { rep.attempts.push({ url, scope, outcome: `HTTP ${r.status}`, ok: false }); continue; }
            const res = await filterToFiles(await openDvfStream(r.body), { dir: o.dir, wanted: new Set([c.code]) });
            got += res.written.length; read += res.rowsRead; kept += res.rowsKept;
          } catch (e) { rep.attempts.push({ url, scope, outcome: describeError(e), ok: false }); }
        }
        if (got) { done(src.id, Array(got).fill(''), read, kept); }
        break;
      }
      // Départemental ou national : un flux par département (ou un seul), filtré en continu.
      const urls = scope === 'departement' ? deps.map((dep) => ({ dep, url: src.url({ year: o.year, dep, code: '' }) })) : [{ dep: '', url: src.url({ year: o.year, dep: '', code: '' }) }];
      let any = false; let read = 0; let kept = 0; let wroteN = 0;
      for (const [i, u] of urls.entries()) {
        const left = new Set([...wanted].filter((c) => !existsSync(path.join(o.dir, `${c}.csv`)) && (scope === 'national' || todo.find((t) => t.code === c)!.dep === u.dep)));
        if (!left.size) continue;
        let r: Awaited<ReturnType<Fetcher>>;
        try { r = await o.fetcher(u.url); } catch (e) { attempt(u.url, scope, describeError(e), false); if (i === 0) break; continue; }
        if (!r.ok || !r.body) { attempt(u.url, scope, `HTTP ${r.status}`, false); if (i === 0) break; continue; }
        try {
          const res = await filterToFiles(await openDvfStream(r.body), { dir: o.dir, wanted: left });
          attempt(u.url, scope, `HTTP ${r.status}, ${res.rowsRead} lignes lues, ${res.rowsKept} gardées (format ${res.format})`, true);
          any = true; read += res.rowsRead; kept += res.rowsKept; wroteN += res.written.length;
          if (res.rowsRead === 0) rep.notes.push(`${u.url} : fichier lu mais vide.`);
        } catch (e) { attempt(u.url, scope, describeError(e), false); if (e instanceof FormatError) rep.notes.push(`${u.url} : ${e.message}`); }
      }
      if (any) done(src.id, Array(wroteN).fill(''), read, kept);
      if (complete()) break;
    }
    if (complete()) break;
  }
  rep.missingCodes = todo.filter((t) => !existsSync(path.join(o.dir, `${t.code}.csv`))).map((t) => t.code);
  rep.state = rep.missingCodes.length === 0 ? 'telecharge' : rep.missingCodes.length < todo.length ? 'partiel' : 'echec';
  return rep;
};

export const renderReport = (reports: YearReport[], when: string): string => {
  const out: string[] = [`Rapport de téléchargement DVF (${when})`, ''];
  for (const r of reports) {
    const label = { 'deja-present': 'déjà présent (rien retéléchargé)', telecharge: 'téléchargé', partiel: 'PARTIEL', echec: 'ÉCHEC' }[r.state];
    out.push(`${r.year} : ${label}${r.method ? ` via ${r.method}` : ''} — ${r.alreadyThere} fichier(s) déjà là, ${r.written} écrit(s)${r.rowsRead ? `, ${r.rowsRead} lignes lues, ${r.rowsKept} gardées` : ''}`);
    for (const a of r.attempts.slice(0, 12)) out.push(`    ${a.ok ? 'OK ' : 'NON'} ${a.url} → ${a.outcome}`);
    if (r.attempts.length > 12) out.push(`    … ${r.attempts.length - 12} autre(s) essai(s)`);
    for (const n of r.notes) out.push(`    note : ${n}`);
    if (r.missingCodes.length) out.push(`    codes sans fichier (${r.missingCodes.length}) : ${r.missingCodes.slice(0, 20).join(', ')}${r.missingCodes.length > 20 ? ', …' : ''}`);
  }
  const bad = reports.filter((r) => r.state === 'echec' || r.state === 'partiel');
  if (bad.length) {
    out.push('', 'ADRESSES À VÉRIFIER (aucune ne répond ou le format est inconnu) :');
    const urls = new Set<string>();
    for (const r of bad) for (const a of r.attempts) if (!a.ok) urls.add(`${a.url}  [${r.year}] ${a.outcome}`);
    for (const u of [...urls].slice(0, 40)) out.push(`  - ${u}`);
    out.push('', 'Pour imposer une adresse exacte trouvée sur cadastre.data.gouv.fr/dvf :', '  npm --prefix backend run immo:download-dvf -- --from AAAA --to AAAA --url "https://…/{year}/….csv.gz"', 'ou, si tu as déjà téléchargé le fichier toi-même :', '  npm --prefix backend run immo:download-dvf -- --file chemin/du/fichier.csv.gz --year AAAA');
  }
  return out.join('\n') + '\n';
};
