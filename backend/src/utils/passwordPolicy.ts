import { PASSWORD_POLICY } from '../config/securityRules';

// Règle alignée sur l'indicateur de l'inscription : 8 caractères minimum, une majuscule, une minuscule, un chiffre.
// Renvoie le message d'erreur à afficher, ou null si le mot de passe est acceptable.
export const checkPassword = (password: unknown, email?: string): string | null => {
  if (typeof password !== 'string') return 'Mot de passe invalide';
  if (password.length < PASSWORD_POLICY.minLength) return `Le mot de passe doit faire au moins ${PASSWORD_POLICY.minLength} caractères`;
  if (password.length > PASSWORD_POLICY.maxLength) return `Le mot de passe ne doit pas dépasser ${PASSWORD_POLICY.maxLength} caractères`;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre';
  }
  const lower = password.toLowerCase();
  if (PASSWORD_POLICY.common.includes(lower)) return 'Ce mot de passe est trop courant';
  if (email && typeof email === 'string') {
    const local = email.split('@')[0].toLowerCase();
    if (local.length >= 4 && lower.includes(local)) return 'Le mot de passe ne doit pas contenir votre adresse e-mail';
  }
  return null;
};
