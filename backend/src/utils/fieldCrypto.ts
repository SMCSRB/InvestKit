import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

// Chiffrement de CHAMPS sensibles au repos (AES-256-GCM) : aujourd'hui le secret 2FA (TOTP).
// Clé : FIELD_ENCRYPTION_KEY (64 caractères hexadécimaux = 32 octets) ; à défaut, dérivée de JWT_SECRET (HKDF) avec un
// avertissement : changer JWT_SECRET rendrait alors les valeurs illisibles, d'où l'intérêt de définir une clé dédiée.
// Format stocké : « enc:v1:<iv>:<tag>:<données> » (base64). Une valeur sans ce préfixe est un ancien texte en clair : elle est
// lue telle quelle (migration douce, voir scripts/encrypt-totp-secrets.ts).
const PREFIX = 'enc:v1:';
let warned = false;

const key = (): Buffer => {
  const dedicated = process.env.FIELD_ENCRYPTION_KEY;
  if (dedicated) {
    if (!/^[0-9a-fA-F]{64}$/.test(dedicated)) throw new Error('FIELD_ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux (openssl rand -hex 32)');
    return Buffer.from(dedicated, 'hex');
  }
  if (!warned) {
    warned = true;
    console.warn('⚠️  FIELD_ENCRYPTION_KEY non défini : clé dérivée de JWT_SECRET. Définis une clé dédiée (openssl rand -hex 32).');
  }
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  return Buffer.from(hkdfSync('sha256', secret, 'investkit-field-encryption', 'v1', 32));
};

export const isEncrypted = (value: string): boolean => value.startsWith(PREFIX);

export const encryptField = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${data.toString('base64')}`;
};

export const decryptField = (stored: string): string => {
  if (!isEncrypted(stored)) return stored; // ancien texte en clair
  const [iv, tag, data] = stored.slice(PREFIX.length).split(':');
  if (!iv || !tag || !data) throw new Error('Valeur chiffrée invalide');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
};
