// Script ops/immo-telecharger.py (téléchargement manuel des données de l'Immobilier réel) : choix des fichiers, garde-fous, rapport limité. Aucun accès réseau ici : fichiers FABRIQUÉS.
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const py = (args: string[], env: Record<string, string> = {}) => spawnSync('python3', [path.join(root, 'ops', 'immo-telecharger.py'), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, DATABASE_URL: '', ...env } });
const hasPython = spawnSync('python3', ['--version']).status === 0;

describe.skipIf(!hasPython)('ops/immo-telecharger.py', () => {
  it('auto-test interne : association des 4 fichiers ANIL, éditeur Terralyse, zip de l\'Insee, page web refusée, sortie limitée à 30 lignes', () => {
    const r = py(['--selftest']);
    expect(r.stdout).toContain('selftest ok'); expect(r.status).toBe(0);
  });
  it('sans argument : mode d\'emploi ; source inconnue refusée', () => {
    expect(py([]).stdout).toContain('python3 ops/immo-telecharger.py anil 2025');
    expect(py(['bidule']).stdout).toContain('Source inconnue');
  });
  it('--file : rapport « --check » de l\'IRL sans rien écrire (fichier fabriqué), avec --apply : refus sans base de test et refus de la base du vrai site', () => {
    const f = path.join(mkdtempSync(path.join(tmpdir(), 'dl-')), 'irl.csv');
    const rows = ['Libellé;Indice (fabriqué)', '', 'Période;Valeur;Codes', ...Array.from({ length: 12 }, (_, i) => `${2021 + Math.floor(i / 4)}-T${(i % 4) + 1};${(130 + 0.8 * i).toFixed(2).replace('.', ',')};A`).reverse()];
    writeFileSync(f, rows.join('\n') + '\n');
    const ok = py(['irl', '--file', f]);
    expect(ok.stdout).toContain('12 trimestres retenus'); expect(ok.stdout).toContain('--check : rien n\'est écrit'); expect(ok.status).toBe(0);
    expect(py(['irl', '--file', f, '--apply']).stdout).toContain('--apply demande DATABASE_URL');
    expect(py(['irl', '--file', f, '--apply'], { DATABASE_URL: 'postgresql://u:p@localhost:5432/investkit' }).stdout).toContain('seule « investkit_design_test » est permise');
    expect(py(['irl', '--file', f, '--apply'], { DATABASE_URL: 'postgresql://u:p@localhost:5432/autre_base' }).stdout).toContain('refusée');
  }, 120_000);
  it('le dossier du vrai site (~/InvestKit) est refusé', () => {
    const src = require('fs').readFileSync(path.join(root, 'ops', 'immo-telecharger.py'), 'utf8') as string;
    expect(src).toContain("os.path.basename(ROOT) == 'InvestKit'");
  });
});
