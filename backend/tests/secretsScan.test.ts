import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Le script anti-secrets doit trouver un vrai secret (dans un fichier ET dans l'historique), ne jamais l'afficher en entier,
// et rester silencieux sur les valeurs de remplacement des fichiers d'exemple.
const SCRIPT = join(__dirname, '../../scripts/check-secrets.mjs');
const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd, stdio: 'pipe' });
const run = (cwd: string, ...a: string[]) => spawnSync('node', [SCRIPT, ...a], { cwd, encoding: 'utf8' });
const repo = () => { const d = mkdtempSync(join(tmpdir(), 'secrets-')); git(d, 'init', '-q'); return d; };

const FAKE_APP_PASSWORD = 'qwer' + 'tyui' + 'opas' + 'dfgh';          // forme d'un mot de passe d'application Google (fabriqué ici, sans valeur réelle)
const FAKE_AWS = 'AKIA' + 'ABCDEFGHIJKLMNOP';

describe('recherche de secrets (scripts/check-secrets.mjs)', () => {
  it('dépôt propre : code 0', () => {
    const d = repo();
    writeFileSync(join(d, 'a.js'), "const pass = process.env.EMAIL_PASS;\nconst jwtSecret = 'change-me-in-production';\n");
    writeFileSync(join(d, '.env.example'), 'EMAIL_PASS=votre_mot_de_passe_ici\nJWT_SECRET=changez-moi-xxxxxxxxxxxx\n');
    git(d, 'add', '.'); git(d, 'commit', '-qm', 'ok');
    const r = run(d);
    expect(r.status, r.stderr).toBe(0);
  });

  it('mot de passe d\'application dans un fichier : code 1, valeur masquée', () => {
    const d = repo();
    writeFileSync(join(d, 'start-dev.sh'), `export EMAIL_PASS="${FAKE_APP_PASSWORD}"\n`);
    git(d, 'add', '.'); git(d, 'commit', '-qm', 'oups');
    const r = run(d, '--tree');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('start-dev.sh');
    expect(r.stderr).not.toContain(FAKE_APP_PASSWORD);
  });

  it('secret retiré du fichier mais encore dans l\'historique : l\'historique le trouve', () => {
    const d = repo();
    writeFileSync(join(d, 'cfg.js'), `const key = '${FAKE_AWS}';\n`);
    git(d, 'add', '.'); git(d, 'commit', '-qm', 'ajout');
    writeFileSync(join(d, 'cfg.js'), 'const key = process.env.KEY;\n');
    git(d, 'commit', '-qam', 'retrait');
    expect(run(d, '--tree').status).toBe(0);
    const r = run(d, '--history');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('historique');
    expect(r.stderr).not.toContain(FAKE_AWS);
  });

  it('un chemin listé dans .secretsignore est ignoré', () => {
    const d = repo();
    writeFileSync(join(d, 'fixtures.txt'), `token ${FAKE_AWS}\n`);
    writeFileSync(join(d, '.secretsignore'), 'fixtures.txt\n');
    git(d, 'add', '.'); git(d, 'commit', '-qm', 'x');
    expect(run(d, '--tree').status).toBe(0);
  });

  it('le dépôt lui-même est propre (fichiers suivis)', () => {
    const r = spawnSync('node', [SCRIPT, '--tree'], { cwd: join(__dirname, '../..'), encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });
});
