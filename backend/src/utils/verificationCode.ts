import { randomInt } from 'crypto';

// Code de vérification à 6 chiffres tiré avec un générateur cryptographique (et non Math.random, prévisible).
export const generateVerificationCode = (): string => String(randomInt(100000, 1000000));
