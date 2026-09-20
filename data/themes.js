export const themes = [
  {
    id: 'dark',
    name: 'Sombre',
    description: 'Thème sombre classique',
    emoji: '🌙',
    colors: {
      primary: '#0f172a',
      secondary: '#1e293b',
      accent: '#3b82f6',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    xpRequired: 0,
    badge: 'Thème de base',
  },
  {
    id: 'light',
    name: 'Clair',
    description: 'Thème clair et lumineux',
    emoji: '☀️',
    colors: {
      primary: '#f8fafc',
      secondary: '#e2e8f0',
      accent: '#2563eb',
      text: '#1e293b',
      textSecondary: 'rgba(30, 41, 59, 0.6)',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    },
    xpRequired: 100,
    badge: 'Lumière du jour',
  },
  {
    id: 'neon',
    name: 'Néon',
    description: 'Thème cyberpunk avec couleurs éclatantes',
    emoji: '⚡',
    colors: {
      primary: '#0a0e27',
      secondary: '#1a1a3e',
      accent: '#00ff88',
      text: '#00ff88',
      textSecondary: '#00cc6f',
      success: '#00ff88',
      warning: '#ffff00',
      error: '#ff0055',
    },
    xpRequired: 500,
    badge: 'Cyberpunk',
  },
  {
    id: 'ocean',
    name: 'Océan',
    description: 'Thème inspiré par les profondeurs marines',
    emoji: '🌊',
    colors: {
      primary: '#0a1428',
      secondary: '#15202b',
      accent: '#1da1f2',
      text: '#e7f5ff',
      textSecondary: 'rgba(231, 245, 255, 0.6)',
      success: '#17bf63',
      warning: '#ffad1f',
      error: '#e0245e',
    },
    xpRequired: 1000,
    badge: 'Explorateur des mers',
  },
  {
    id: 'forest',
    name: 'Forêt',
    description: 'Thème naturel avec teintes vertes',
    emoji: '🌲',
    colors: {
      primary: '#0f2818',
      secondary: '#1a4d2e',
      accent: '#52b788',
      text: '#e8f5e9',
      textSecondary: 'rgba(232, 245, 233, 0.7)',
      success: '#66bb6a',
      warning: '#fbc02d',
      error: '#e53935',
    },
    xpRequired: 1500,
    badge: 'Gardien de la nature',
  },
  {
    id: 'sunset',
    name: 'Coucher de soleil',
    description: 'Thème chaud avec gradient crépusculaire',
    emoji: '🌅',
    colors: {
      primary: '#2d1b27',
      secondary: '#3d2645',
      accent: '#f97316',
      text: '#fef3c7',
      textSecondary: 'rgba(254, 243, 199, 0.7)',
      success: '#fbbf24',
      warning: '#fb923c',
      error: '#f87171',
    },
    xpRequired: 2000,
    badge: 'Collectionneur de couchers',
  },
  {
    id: 'minimalist',
    name: 'Minimaliste',
    description: 'Design épuré et minimaliste',
    emoji: '◆',
    colors: {
      primary: '#fafafa',
      secondary: '#f5f5f5',
      accent: '#000000',
      text: '#1a1a1a',
      textSecondary: '#666666',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
    xpRequired: 2500,
    badge: 'Puriste',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Thème exclusif doré et luxueux',
    emoji: '✨',
    colors: {
      primary: '#1a1410',
      secondary: '#2d2520',
      accent: '#d4af37',
      text: '#f5e6d3',
      textSecondary: 'rgba(245, 230, 211, 0.7)',
      success: '#90ee90',
      warning: '#ffd700',
      error: '#ff6b6b',
    },
    xpRequired: 5000,
    badge: 'Élite',
  },
];

export function getThemeById(id) {
  return themes.find((t) => t.id === id) || themes[0];
}

export function getUnlockedThemes(totalXP) {
  return themes.filter((t) => t.xpRequired <= totalXP);
}

export function getNextTheme(totalXP) {
  const locked = themes.find((t) => t.xpRequired > totalXP);
  return locked || null;
}
