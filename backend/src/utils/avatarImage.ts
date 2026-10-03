import sharp from 'sharp';

// Photo de profil : TOUT ce qui arrive du navigateur est ré-encodé ici. On ne conserve jamais le fichier d'origine :
// le vrai format est lu dans les premiers octets (jamais l'extension ni le type annoncé), l'image est pivotée selon son orientation,
// recadrée en carré 256 x 256, recompressée en WebP, et toutes les métadonnées (EXIF, localisation GPS, profil couleur, miniature) sont
// supprimées (sharp n'en recopie aucune tant qu'on ne demande pas `withMetadata`).
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;   // 3 Mo reçus au maximum
export const AVATAR_SIZE = 256;
const MAX_INPUT_PIXELS = 40_000_000;                // protège contre les images « bombes » (petit fichier, milliards de pixels)

export type AvatarErrorCode = 'EMPTY' | 'TOO_LARGE' | 'BAD_TYPE' | 'UNREADABLE';
export class AvatarError extends Error {
  constructor(public code: AvatarErrorCode, message: string) { super(message); this.name = 'AvatarError'; }
}

// Vrai type d'après les octets de tête : JPEG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A), WebP (RIFF....WEBP).
// Contrôle de type explicite (texte et tableau écartés avant toute lecture) : une valeur venue d'une requête n'est jamais supposée être un Buffer.
const isBytes = (v: unknown): v is Buffer => typeof v === 'object' && v !== null && !Array.isArray(v) && Buffer.isBuffer(v);

export const sniffImageType = (input: unknown): 'jpeg' | 'png' | 'webp' | null => {
  if (!isBytes(input)) return null;
  const b: Buffer = input;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

export const processAvatar = async (input: unknown): Promise<{ image: Buffer; contentType: 'image/webp' }> => {
  if (!isBytes(input) || input.length === 0) throw new AvatarError('EMPTY', 'Aucune image reçue.');
  if (input.length > AVATAR_MAX_BYTES) throw new AvatarError('TOO_LARGE', 'Image trop lourde (3 Mo maximum).');
  if (!sniffImageType(input)) throw new AvatarError('BAD_TYPE', 'Format non pris en charge : choisis une vraie image JPG, PNG ou WebP.');
  try {
    const image = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error', animated: false })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
    return { image, contentType: 'image/webp' };
  } catch {
    throw new AvatarError('UNREADABLE', 'Ce fichier n\'est pas une image lisible.');
  }
};
