import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

// Bot Discord (indépendant du site) : contrôles statiques, sans réseau ni jeton.
const SRC = join(__dirname, '../../discord-bot/src');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC);

describe('bot Discord', () => {
  it('aucun fichier de sauvegarde (.bak) n\'est suivi dans le code du bot', () => {
    expect(files.filter((f) => /\.(bak|orig|old)$/.test(f))).toEqual([]);
  });
  it('plus d\'appel à isCategory() (inexistant en discord.js v14) : on compare avec ChannelType.GuildCategory', () => {
    const bad = files.filter((f) => f.endsWith('.js') && /\.isCategory\s*\(/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
  it('chaque fichier du bot est du JavaScript valide (node --check)', () => {
    for (const f of files.filter((x) => x.endsWith('.js'))) {
      const r = spawnSync('node', ['--check', f], { encoding: 'utf8' });
      expect(r.status, `${f}\n${r.stderr}`).toBe(0);
    }
  });
});
