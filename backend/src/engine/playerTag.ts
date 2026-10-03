import { TAG } from '../config/tagRules';

// Moteur PUR de l'identifiant « Pseudo#tag » : aucune base, aucune horloge, aucun réseau (testable seul).

// « Pliage » des ressemblances : minuscules, sans accents, et les caractères qui se confondent à l'œil sont ramenés au même
// (0/o, 1/i/l/|, 5/s, 3/e, 4/a, 8/b, $/s, @/a). « Adm1n » et « admin » donnent donc la même clé. Le même pliage existe en base (ik_fold).
const FOLD_FROM = '01i|5$3@4';
const FOLD_TO = 'olllsseaa';
export const fold = (s: string): string => {
  const base = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let out = '';
  for (const ch of base) { const i = FOLD_FROM.indexOf(ch); out += i >= 0 ? FOLD_TO[i] : ch; }
  return out;
};

export type TagCheck = { ok: true; tag: string } | { ok: false; code: 'FORMAT' | 'RESERVED' | 'INSULT'; message: string };

// Format d'un # choisi : lettres et chiffres (sans accents), 3 à 12 caractères. La casse choisie est conservée à l'affichage ; l'unicité l'ignore.
export const checkTagFormat = (raw: unknown): TagCheck => {
  const tag = String(raw ?? '').replace(/^#/, '').trim();
  if (!new RegExp(`^[A-Za-z0-9]{${TAG.min},${TAG.max}}$`).test(tag)) {
    return { ok: false, code: 'FORMAT', message: `Le # doit faire ${TAG.min} à ${TAG.max} caractères : lettres sans accent et chiffres seulement.` };
  }
  const f = fold(tag);
  if (TAG.reserved.some((w) => f.includes(fold(w)))) return { ok: false, code: 'RESERVED', message: 'Ce # est réservé : choisis-en un autre.' };
  if (TAG.insults.some((w) => f.includes(fold(w)))) return { ok: false, code: 'INSULT', message: 'Ce # n\'est pas autorisé : choisis-en un autre.' };
  return { ok: true, tag };
};

// # automatique : 4 chiffres tirés de l'identifiant du joueur (stable : le même joueur retrouve toujours le même, sans écriture).
export const autoTagFor = (userId: string, salt = 0): string => {
  const hex = String(userId).replace(/-/g, '').slice(0, 8) || '0';
  const n = (parseInt(hex, 16) + salt * 7919) % 10 ** TAG.autoDigits;
  return String(n).padStart(TAG.autoDigits, '0');
};

export const identityOf = (username: string | null, tag: string | null): string | null => (username && tag ? `${username}#${tag}` : null);

// « Pseudo#tag » saisi par un joueur qui cherche un ami : { name, tag } ou null si ce n'est pas cette forme.
export const parseIdentity = (raw: unknown): { name: string; tag: string } | null => {
  const s = String(raw ?? '').trim();
  const i = s.lastIndexOf('#');
  if (i <= 0 || i === s.length - 1) return null;
  const name = s.slice(0, i).trim(); const tag = s.slice(i + 1).trim();
  if (!name || name.length > 30 || !/^[A-Za-z0-9]{1,12}$/.test(tag)) return null;
  return { name, tag };
};

// Faut-il afficher le # choisi (Pro, ou période de grâce après la fin du Pro) ? Fonction pure : `now` est fourni par l'appelant.
export const customTagVisible = (p: { isPro: boolean; graceUntil: Date | null }, now: Date): boolean =>
  p.isPro || p.graceUntil === null || now < p.graceUntil;
