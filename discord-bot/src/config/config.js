export const config = {
  // Couleurs embed
  colors: {
    primary: '#0099FF',
    success: '#00AA00',
    error: '#FF0000',
    warning: '#FFD700',
    info: '#1E90FF',
  },

  // Émojis
  emojis: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    money: '💰',
    chart: '📊',
    rocket: '🚀',
  },

  // Paramètres du bot
  bot: {
    prefix: '!',
    status: 'InvestKit - Investissez Malin 📈',
  },

  // Canaux par défaut
  channels: {
    welcome: 'bienvenue',
    announcements: '📰-news',
    rules: '📋-regles',
    roles: '🎭-roles',
  },

  // Rôles
  roles: {
    investor: 'Investisseur',
    trader: 'Trader',
    learner: 'Apprenant',
    moderator: 'Modérateur',
  },
};

export default config;
