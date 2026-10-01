// Génère src/data/educationCatalog.ts depuis le contenu pédagogique (data/education.js) : le serveur ne récompense QUE des chapitres qui existent.
// Usage : node scripts/gen-education-catalog.mjs          (écrit le fichier)
//         node scripts/gen-education-catalog.mjs --check  (code 1 si le fichier est périmé : utilisé par les tests)
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'backend', 'src', 'data', 'educationCatalog.ts');
const { educationDomains } = await import(join(root, 'data', 'education.js'));
const catalog = Object.fromEntries(educationDomains.map((d) => [d.id, d.chapters.map((c) => String(c.id))]));
const text = `// GÉNÉRÉ par scripts/gen-education-catalog.mjs depuis data/education.js : ne pas modifier à la main.
// Domaines et chapitres qui existent : le serveur refuse toute autre complétion (pas de pièces ni d'XP pour des identifiants inventés).
export const EDUCATION_CATALOG: Record<string, string[]> = ${JSON.stringify(catalog, null, 2)};
`;
if (process.argv.includes('--check')) process.exit(readFileSync(out, 'utf8') === text ? 0 : 1);
writeFileSync(out, text);
console.log('catalogue :', Object.entries(catalog).map(([k, v]) => `${k}=${v.length}`).join(', '));
