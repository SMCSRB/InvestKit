// Vérifie que app/lib/siteInfo.js est prêt pour l'ouverture au public.
//   node scripts/check-site-info.mjs          → affiche l'état, code de sortie 1 s'il reste des points à régler
//   node scripts/check-site-info.mjs --warn   → même affichage, mais ne bloque jamais (utilisé avant chaque build)
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const findProblems = (info) => {
  const problems = [];
  const empty = (v) => v === null || v === undefined || String(v).trim() === '';
  if (empty(info.contactEmail)) problems.push('E-mail de contact vide.');
  else if (/example\.(com|org|net)$/i.test(String(info.contactEmail).split('@')[1] || '')) {
    problems.push(`E-mail de contact provisoire (${info.contactEmail}) : mettre une vraie adresse.`);
  }
  if (empty(info.hostName)) problems.push("Nom de l'hébergeur non renseigné.");
  if (empty(info.hostAddress)) problems.push("Adresse ou contact de l'hébergeur non renseigné.");
  for (const k of ['publisherName', 'publisherStatus', 'publicationDirector']) {
    if (empty(info[k])) problems.push(`${k} non renseigné.`);
  }
  return problems;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const { SITE_INFO } = await import(pathToFileURL(path.join(here, '..', 'app', 'lib', 'siteInfo.js')).href);
  const problems = findProblems(SITE_INFO);
  if (problems.length === 0) {
    console.log('✅ siteInfo.js : prêt pour l\'ouverture au public (à faire valider par un juriste).');
  } else {
    console.warn('\n⚠️  AVANT L\'OUVERTURE AU PUBLIC — pages légales incomplètes (app/lib/siteInfo.js) :');
    for (const p of problems) console.warn('   • ' + p);
    console.warn('   (Sans gravité pendant la phase sur invitation.)\n');
    if (!process.argv.includes('--warn')) process.exit(1);
  }
}
