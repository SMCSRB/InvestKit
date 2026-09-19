/**
 * Authentification client-side
 * Utilise localStorage pour les tokens JWT
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Vérifier si l'utilisateur est connecté
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('authToken') !== null;
};

// Obtenir le token JWT
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Obtenir l'email de l'utilisateur
export const getUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userEmail');
};

// Obtenir le nom de l'utilisateur
export const getUserName = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userName');
};

// Déconnexion
export const logout = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('pendingUserId');
  localStorage.removeItem('pendingEmail');
  window.location.href = '/';
};

// Évaluer la force du mot de passe
export interface PasswordStrength {
  score: number;
  strength: string;
  color: string;
  feedback: string[];
}

export const evaluatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 20;
  else feedback.push('Min 8 caractères');

  if (/[A-Z]/.test(password)) score += 20;
  else feedback.push('Maj A-Z');

  if (/[a-z]/.test(password)) score += 20;
  else feedback.push('Min a-z');

  if (/[0-9]/.test(password)) score += 20;
  else feedback.push('Chiffres 0-9');

  if (/[!@#$%^&*]/.test(password)) score += 20;
  else feedback.push('Spéciaux !@#');

  let strength = 'Très faible';
  let color = '#FF6B6B'; // Rouge

  if (score >= 80) {
    strength = 'Fort';
    color = '#51CF66'; // Vert
  } else if (score >= 60) {
    strength = 'Moyen';
    color = '#FFD93D'; // Jaune
  } else if (score >= 40) {
    strength = 'Faible';
    color = '#FFA500'; // Orange
  }

  return { score, strength, color, feedback };
};

// API: Register
export const register = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  profile: any
): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        profile,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'inscription');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingUserId', data.userId);
      localStorage.setItem('pendingEmail', email);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// API: Verify Email
export const verifyEmail = async (userId: string, code: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: parseInt(userId),
        verificationCode: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Code invalide');
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingUserId');
      localStorage.removeItem('pendingEmail');
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// API: Login
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur de connexion');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.firstName);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// API: Forgot Password
export const forgotPassword = async (email: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la demande');
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

// API: Reset Password
export const resetPassword = async (resetToken: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken,
        newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la réinitialisation');
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
