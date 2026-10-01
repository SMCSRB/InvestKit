#!/usr/bin/env node
// Recherche de secrets (mots de passe, clés d'API, jetons, clés privées) dans le dépôt, SANS aucune dépendance.
//   node scripts/check-secrets.mjs            → fichiers suivis + tout l'historique git (toutes les branches)
//   node scripts/check-secrets.mjs --tree     → fichiers suivis seulement (rapide : sert avant un commit)
//   node scripts/check-secrets.mjs --history  → historique seulement
// Les valeurs trouvées ne sont JAMAIS affichées en entier (deux premiers caractères + ***). Code de sortie 1 s'il y a un résultat.
// Compléments : .github/workflows/security.yml (gitleaks) et le hook git conseillé dans docs/secrets.md.
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const args = new Set(process.argv.slice(2));
const doTree = !args.has('--history');
const doHistory = !args.has('--tree');

// Fichiers ignorés (jamais de secret réel : verrous de dépendances, captures, modèles d'exemple). Liste dans .secretsignore (un motif par ligne).
const ignorePatterns = (existsSync('.secretsignore') ? readFileSync('.secretsignore', 'utf8').split('\n') : [])
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*')}$`));
const ignored = (file) => ignorePatterns.some((re) => re.test(file));

const RULES = [
  { name: 'Clé privée', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: 'Clé AWS', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'Clé Stripe réelle', re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}\b/ },
  { name: 'Secret de webhook Stripe', re: /\bwhsec_[A-Za-z0-9]{24,}\b/ },
  { name: 'Jeton GitHub', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { name: 'Jeton Slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Clé Google', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Clé SendGrid', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { name: 'Clé Resend', re: /\bre_[A-Za-z0-9]{24,}\b/ },
  { name: 'Jeton de bot Discord', re: /\b[MNO][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,}\b/ },
  { name: 'Jeton JWT', re: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/ },
  { name: 'Mot de passe d\'application Google (16 lettres)', re: /(?:pass(?:word)?|pwd|app_?pass(?:word)?)[a-z0-9_]*\s*[=:]\s*['"]?[a-z]{4}[ -]?[a-z]{4}[ -]?[a-z]{4}[ -]?[a-z]{4}['"]?\s*$/i },
  { name: 'URL de base de données avec mot de passe', re: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:([^\s@/]{6,})@(?!localhost|127\.0\.0\.1|db\b|postgres\b)[^\s/]+/i, valueGroup: 1 },
];
// Affectations génériques : NOM_QUI_CONTIENT(PASS|SECRET|TOKEN|KEY…) = valeur
const GENERIC = /\b([A-Za-z0-9_]*(?:PASS(?:WORD)?|PASSWD|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY|CREDENTIAL|SMTP_PASS)[A-Za-z0-9_]*)\s*[=:]\s*['"]?([^\s'"#,;)]{12,})/i;
const PLACEHOLDER = /(change|xxx|votre|vos[-_]|exemple|example|your|placeholder|dummy|fake|fictif|test|todo|\.\.\.|<[^>]+>|\{\{|\$\{|\$\(|process\.env|env\.|os\.environ|getenv|chang(?:e|ez)|secret-for|audit-only|0{6,}|a{16,}|\*{3,}|masqu|redact|à remplir|a remplir|sk_test|pk_test|invalid|none|null|undefined|true|false)/i;

const entropy = (s) => { const m = new Map(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); let h = 0; for (const n of m.values()) { const p = n / s.length; h -= p * Math.log2(p); } return h; };
const mask = (v) => `${String(v).slice(0, 2)}***(${String(v).length} car.)`;

function scanLine(line) {
  if (line.length > 600) return null;                       // fichiers minifiés, données : pas des affectations
  for (const r of RULES) {
    const m = r.re.exec(line);
    if (m && !(PLACEHOLDER.test(line) && !['Clé privée', 'Clé AWS'].includes(r.name))) return { rule: r.name, value: m[r.valueGroup ?? 0] };
  }
  const g = GENERIC.exec(line);
  if (g) {
    const v = g[2];
    if (PLACEHOLDER.test(v) || PLACEHOLDER.test(g[1]) || /[()]/.test(v) || /^[a-z][A-Za-z]*(\.[A-Za-z]+)+$/.test(v) || /^[A-Z][A-Z0-9_]+$/.test(v)) return null;
    if (/^[a-z]+(-[a-z]+)+$/.test(v) && !/\d/.test(v)) return null;           // « mot-de-passe-oublie » : une phrase, pas un secret
    if (entropy(v) >= 3.3 && /[0-9]/.test(v) && /[A-Za-z]/.test(v)) return { rule: `Valeur suspecte pour ${g[1]}`, value: v };
  }
  return null;
}

const findings = [];
const seen = new Set();
const report = (where, file, n, hit) => { const k = `${file}|${hit.rule}|${hit.value}`; if (seen.has(k)) return; seen.add(k); findings.push({ where, file, n, rule: hit.rule, value: mask(hit.value) }); };

if (doTree) {
  const files = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  for (const f of files) {
    if (ignored(f) || /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|gz|mp4|webm)$/i.test(f) || f.endsWith('package-lock.json')) continue;
    let txt; try { txt = readFileSync(f, 'utf8'); } catch { continue; }
    if (txt.includes('\u0000')) continue;
    txt.split('\n').forEach((line, i) => { const h = scanLine(line); if (h) report('fichier suivi', f, i + 1, h); });
  }
}

async function history() {
  await new Promise((resolve, reject) => {
    const p = spawn('git', ['log', '--all', '-p', '--no-color', '-U0', '--format=@@COMMIT %h %s'], { maxBuffer: 1 << 30 });
    const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
    let commit = '?'; let file = '?'; let n = 0;
    rl.on('line', (line) => {
      if (line.startsWith('@@COMMIT ')) { commit = line.slice(9, 60); return; }
      if (line.startsWith('+++ b/')) { file = line.slice(6); return; }
      if (line.startsWith('@@ ')) { const m = /\+(\d+)/.exec(line); n = m ? Number(m[1]) - 1 : 0; return; }
      if (line.startsWith('+') && !line.startsWith('+++')) { n += 1; if (ignored(file) || file.endsWith('package-lock.json')) return; const h = scanLine(line.slice(1)); if (h) report(`historique (${commit})`, file, n, h); }
    });
    p.on('error', reject); p.on('close', resolve);
  });
}
if (doHistory) await history();

if (findings.length === 0) { console.log(`✅ Aucun secret trouvé (${doTree ? 'fichiers suivis' : ''}${doTree && doHistory ? ' + ' : ''}${doHistory ? 'historique de toutes les branches' : ''}).`); process.exit(0); }
console.error(`❌ ${findings.length} secret(s) possible(s) :`);
for (const f of findings) console.error(` - ${f.rule} — ${f.file}:${f.n} — ${f.where} — valeur ${f.value}`);
console.error('\nSi c\'est un VRAI secret : révoque-le tout de suite chez le fournisseur (le retirer du dépôt ne suffit pas, il reste dans l\'historique).');
console.error('Si c\'est un faux positif (exemple, valeur de test) : ajoute le chemin du fichier dans .secretsignore avec un commentaire.');
process.exit(1);
