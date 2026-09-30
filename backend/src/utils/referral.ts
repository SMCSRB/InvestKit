import { randomBytes } from 'crypto';
import { userRepository } from '../repositories/userRepository';

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) pour un code lisible
// à l'oral/à l'écrit quand on le partage.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const randomCode = (length = 8): string => {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
};

export const generateUniqueReferralCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await userRepository.findByReferralCode(code);
    if (!existing) return code;
  }
  throw new Error('Impossible de générer un code de parrainage unique');
};
