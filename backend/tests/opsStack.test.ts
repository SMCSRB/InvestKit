import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import net from 'net';

// ops/stack.sh : démarrer, surveiller et surtout ARRÊTER PAR PORT (le fichier .pid ne contient que le lanceur, pas le vrai processus).
const SCRIPT = join(__dirname, '../../ops/stack.sh');
const has = (cmd: string) => spawnSync('bash', ['-c', `command -v ${cmd}`]).status === 0;
const canRun = has('bash') && (has('lsof') || has('ss') || has('fuser')) && has('setsid');

const freePort = () => new Promise<number>((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); }); });
const listening = (port: number) => new Promise<boolean>((resolve) => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); resolve(true); }); c.on('error', () => resolve(false)); c.setTimeout(500, () => { c.destroy(); resolve(false); }); });

describe.skipIf(!canRun)('ops/stack.sh : arrêt par port', () => {
  it('démarre, indique l\'état, refuse un double démarrage, arrête par port (lanceur ≠ processus qui écoute), puis redémarre', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stack-'));
    mkdirSync(join(dir, 'api')); mkdirSync(join(dir, 'site')); mkdirSync(join(dir, 'logs'));
    // Lanceur qui garde un enfant, comme « npm run dev » → node : le PID du lanceur n'est PAS celui qui écoute.
    writeFileSync(join(dir, 'api', 'start-fake.sh'), `#!/usr/bin/env bash\nnode -e "require('http').createServer((q,r)=>r.end('ok')).listen(process.env.PORT)" &\nwait\n`);
    chmodSync(join(dir, 'api', 'start-fake.sh'), 0o755);
    const apiPort = await freePort(); const sitePort = await freePort();
    const env = { ...process.env, API_PORT: String(apiPort), SITE_PORT: String(sitePort), LOG_DIR: join(dir, 'logs'), RUN_DIR: join(dir, 'run'),
      API_DIR: join(dir, 'api'), API_START: './start-fake.sh', SITE_DIR: join(dir, 'site'), WAIT_SECONDS: '20',
      SITE_START: `node -e "require('http').createServer((q,r)=>r.end('hello')).listen(process.env.PORT)"`, SITE_ENV: 'NODE_ENV=production' };
    const run = (...args: string[]) => spawnSync('bash', [SCRIPT, ...args], { env, encoding: 'utf8', timeout: 60000 });
    try {
      expect(run('status').status).toBe(1);                                    // rien ne tourne
      const start = run('start'); expect(start.status, start.stdout + start.stderr).toBe(0);
      expect(await listening(apiPort)).toBe(true); expect(await listening(sitePort)).toBe(true);
      expect(run('status').stdout).toContain('en marche');
      expect(run('start', 'api').stdout).toContain('déjà en marche');         // pas de second lancement
      const stop = run('stop'); expect(stop.status, stop.stdout + stop.stderr).toBe(0);
      expect(await listening(apiPort)).toBe(false); expect(await listening(sitePort)).toBe(false);
      expect(run('stop').stdout).toContain('déjà arrêté');                     // arrêter deux fois ne plante pas
      expect(run('restart', 'api').status).toBe(0);
      expect(await listening(apiPort)).toBe(true);
    } finally { run('stop'); }
    expect(await listening(apiPort)).toBe(false);
  }, 120000);

  it('un service qui ignore l\'arrêt poli est arrêté de force (le port est bien libéré)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stack-'));
    mkdirSync(join(dir, 'logs'));
    const port = await freePort();
    const env = { ...process.env, API_PORT: String(port), SITE_PORT: String(await freePort()), LOG_DIR: join(dir, 'logs'), RUN_DIR: join(dir, 'run'), API_DIR: dir, WAIT_SECONDS: '20',
      API_START: `node -e "process.on('SIGTERM',()=>{});require('http').createServer((q,r)=>r.end('ok')).listen(process.env.PORT)"` };
    const run = (...args: string[]) => spawnSync('bash', [SCRIPT, ...args], { env, encoding: 'utf8', timeout: 60000 });
    try {
      expect(run('start', 'api').status).toBe(0);
      expect(await listening(port)).toBe(true);
      expect(run('stop', 'api').status).toBe(0);
      expect(await listening(port)).toBe(false);
    } finally { run('stop', 'api'); }
  }, 120000);
});

describe('guides : plus de commande d\'arrêt fausse', () => {
  it('aucun guide ne contient « kill -- -$(cat … .pid) »', () => {
    const { readFileSync } = require('fs');
    for (const f of ['docs/DEPLOIEMENT-DEBUTANT.md', 'docs/TEST-DESIGN.md', 'docs/DEPLOIEMENT.md']) {
      expect(readFileSync(join(__dirname, '../..', f), 'utf8'), f).not.toMatch(/kill --? -\$\(cat/);
    }
  });
  it('les guides renvoient à ops/stack.sh', () => {
    const { readFileSync } = require('fs');
    for (const f of ['docs/DEPLOIEMENT-DEBUTANT.md', 'docs/TEST-DESIGN.md']) expect(readFileSync(join(__dirname, '../..', f), 'utf8'), f).toContain('ops/stack.sh');
  });
});
