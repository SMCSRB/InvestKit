// Configuration
const API_URL = 'http://192.168.1.201:5000/api';

// ==========================================
// 🔐 AUTHENTIFICATION
// ==========================================

// Vérifier si l'utilisateur est connecté
const isLoggedIn = () => {
  return localStorage.getItem('authToken') !== null;
};

// Obtenir le token
const getToken = () => {
  return localStorage.getItem('authToken');
};

// Déconnecter
const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  window.location.href = 'index.html';
};

// ==========================================
// 📝 VALIDATION MOT DE PASSE
// ==========================================

// Évaluer la force du mot de passe
const evaluatePasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

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

// Mettre à jour la barre de force en temps réel
const setupPasswordStrengthMeter = (inputId, meterId, textId) => {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  const text = document.getElementById(textId);

  if (!input) return;

  input.addEventListener('input', () => {
    const password = input.value;
    const evaluation = evaluatePasswordStrength(password);

    if (meter) {
      meter.style.width = evaluation.score + '%';
      meter.style.backgroundColor = evaluation.color;
    }

    if (text) {
      text.textContent = `${evaluation.score}% - ${evaluation.strength}`;
      text.style.color = evaluation.color;
    }
  });
};

// ==========================================
// 📤 REQUÊTES API
// ==========================================

// REGISTER
const register = async (email, password, firstName, lastName, profile) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    // Sauvegarder l'userId pour la vérification d'email
    localStorage.setItem('pendingUserId', data.userId);
    localStorage.setItem('pendingEmail', email);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// VERIFY EMAIL
const verifyEmail = async (userId, code) => {
  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: parseInt(userId),
        verificationCode: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Code invalide');
    }

    // Nettoyer le localStorage
    localStorage.removeItem('pendingUserId');
    localStorage.removeItem('pendingEmail');

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// LOGIN
const login = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur de connexion');
    }

    // Sauvegarder le token et les infos utilisateur
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('userName', data.user.firstName);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// FORGOT PASSWORD
const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la demande');
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// RESET PASSWORD
const resetPassword = async (resetToken, newPassword) => {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    return { success: false, error: error.message };
  }
};

// Exporter les fonctions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isLoggedIn,
    getToken,
    logout,
    evaluatePasswordStrength,
    setupPasswordStrengthMeter,
    register,
    verifyEmail,
    login,
    forgotPassword,
    resetPassword,
  };
}

