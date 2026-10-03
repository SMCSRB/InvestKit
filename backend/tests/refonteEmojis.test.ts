import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const walk = (dir: string, exts: RegExp, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out); else if (exts.test(e.name)) out.push(p);
  }
  return out;
};
const rel = (p: string) => path.relative(root, p);
// emoji « d'interface » (pas les flèches, ✓, ✕, ●, ▲, ♥, ⌘ qui sont des symboles typographiques)
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}\u{2728}\u{23F1}\u{23F0}\u{20E3}]/u;
const TYPO = /[✓✕✗●▲▼♥⌘★☆•]/g;

describe('refonte des emojis : plus aucun emoji affiché dans l\'interface', () => {
  const files = ['app', 'data', 'lib'].flatMap((d) => walk(path.join(root, d), /\.(jsx?|css)$/));

  it('aucun fichier du site (app, data, lib) ne contient d\'emoji, sauf la table de correspondance des anciennes valeurs', () => {
    const offenders = files.filter((f) => !f.endsWith(path.join('ui', 'emojiMap.js')))
      .filter((f) => EMOJI.test(fs.readFileSync(f, 'utf8').replace(TYPO, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('la pièce 🪙 n\'apparaît plus ni dans l\'API (messages, notifications) ni dans les tests', () => {
    const be = [...walk(path.join(root, 'backend', 'src'), /\.ts$/), ...walk(path.join(root, 'backend', 'tests'), /\.ts$/)]
      .filter((f) => !f.endsWith('refonteEmojis.test.ts'))
      .filter((f) => fs.readFileSync(f, 'utf8').includes('🪙')).map(rel);
    expect(be).toEqual([]);
  });

  it('chaque icône demandée par nom existe dans le jeu d\'icônes', () => {
    const icon = fs.readFileSync(path.join(root, 'app/components/ui/Icon.jsx'), 'utf8');
    const lucide = fs.readFileSync(path.join(root, 'app/components/ui/lucideIcons.js'), 'utf8');
    const known = new Set<string>(['coin']);
    for (const m of icon.matchAll(/^  (\w+): '/gm)) known.add(m[1]);
    for (const m of lucide.matchAll(/^  (\w+): \[/gm)) known.add(m[1]);
    const used = new Set<string>();
    for (const f of files.filter((x) => /\.jsx?$/.test(x))) {
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/<(?:Icon|Glyph)\b[^>]*?\b(?:name|g)="([A-Za-z0-9]+)"/g)) used.add(m[1]);
    }
    const map = fs.readFileSync(path.join(root, 'app/components/ui/emojiMap.js'), 'utf8');
    for (const m of map.matchAll(/: '([A-Za-z0-9]+)',?$/gm)) used.add(m[1]);
    const missing = [...used].filter((n) => !known.has(n));
    expect(missing).toEqual([]);
  });

  it('la pièce est un SVG accessible qui se lit « InvestCoins »', () => {
    const c = fs.readFileSync(path.join(root, 'app/components/ui/Coin.jsx'), 'utf8');
    expect(c).toMatch(/role="img"/);
    expect(c).toMatch(/aria-label=\{label\}/);
    expect(c).toMatch(/label = 'InvestCoins'/);
  });

  it('licence : Lucide (ISC), version fixée, notice conservée', () => {
    const lic = fs.readFileSync(path.join(root, 'app/components/ui/lucide-LICENSE.txt'), 'utf8');
    expect(lic).toMatch(/ISC License/);
    expect(lic).toMatch(/Lucide Icons and Contributors/);
    expect(fs.readFileSync(path.join(root, 'app/components/ui/lucideIcons.js'), 'utf8')).toMatch(/lucide-static 1\.49\.0, licence ISC/);
    expect(fs.readFileSync(path.join(root, 'docs/licences-icones.md'), 'utf8')).toMatch(/ISC/);
  });

  it('non-régression : l\'état du message de l\'onboarding ne dépend plus d\'un emoji', () => {
    const o = fs.readFileSync(path.join(root, 'app/onboarding/page.jsx'), 'utf8');
    expect(o).toMatch(/messageOk/);
    expect(o).not.toMatch(/message\.includes\(/);
  });
});
