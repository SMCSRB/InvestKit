import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const ISSUER = 'InvestKit';

export const generateTotpSecret = (): string => authenticator.generateSecret();

export const generateQrCodeDataUrl = async (email: string, secret: string): Promise<string> => {
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  return QRCode.toDataURL(otpauthUrl);
};

export const verifyTotpCode = (code: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
};

// Codes de secours : 8 codes à usage unique, affichés en clair une seule
// fois à la génération puis stockés hashés (comme un mot de passe).
export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(randomBytes(5).toString('hex')); // 10 caractères hexadécimaux
  }
  return codes;
};

export const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
};

// Vérifie un code de secours et renvoie la liste mise à jour (code consommé
// retiré) si trouvé, ou null si aucun des hashs ne correspond.
export const consumeBackupCode = async (
  code: string,
  hashedCodes: string[]
): Promise<string[] | null> => {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(code, hashedCodes[i])) {
      return [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)];
    }
  }
  return null;
};
