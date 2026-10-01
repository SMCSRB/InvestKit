import { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'guildCreate',
  async execute(guild) {
    console.log(`🆕 Bot ajouté au serveur: ${guild.name}`);
    try {
      await setupCompleteGuild(guild);
    } catch (error) {
      console.error(`❌ Erreur configuration ${guild.name}:`, error);
    }
  },
};

async function setupCompleteGuild(guild) {
  console.log(`⚙️ Configuration ULTRA complète du serveur ${guild.name}...`);

  // 1. Créer la hiérarchie de rôles
  await createRoleHierarchy(guild);

  // 2. Créer les catégories et canaux
  await createCategoriesAndChannels(guild);

  // 3. Configurer les permissions
  await configurePermissions(guild);

  // 4. Poster les messages de bienvenue
  await postWelcomeMessages(guild);

  console.log(`✅ Configuration ULTRA complète de ${guild.name}!`);
}

async function createRoleHierarchy(guild) {
  const roles = [
    // Rôles de statut
    { name: '👑 Propriétaire', color: '#FF0000', emoji: '👑', hoist: true },
    { name: '🔱 Co-Propriétaire', color: '#DC143C', emoji: '🔱', hoist: true },
    { name: '🛡️ Administrateur', color: '#FF6347', emoji: '🛡️', hoist: true },
    { name: '👮 Modérateur', color: '#FFD700', emoji: '👮', hoist: true },
    { name: '🎖️ Modérateur Junior', color: '#FFA500', emoji: '🎖️', hoist: false },

    // Rôles premium/vip
    { name: '💎 VIP Premium', color: '#E600FF', emoji: '💎', hoist: true },
    { name: '⭐ VIP Gold', color: '#FFD700', emoji: '⭐', hoist: true },
    { name: '🌟 VIP Silver', color: '#C0C0C0', emoji: '🌟', hoist: true },

    // Rôles d'investissement
    { name: '💰 Investisseur', color: '#00AA00', emoji: '💰', hoist: false },
    { name: '📊 Trader', color: '#0099FF', emoji: '📊', hoist: false },
    { name: '🎓 Apprenant', color: '##00FF00', emoji: '🎓', hoist: false },

    // Rôles spécialisés
    { name: '🔐 Crypto Expert', color: '#FF8C00', emoji: '🔐', hoist: false },
    { name: '🏦 Immobilier Expert', color: '#8B4513', emoji: '🏦', hoist: false },
    { name: '📈 Bourse Expert', color: '#4169E1', emoji: '📈', hoist: false },
    { name: '💳 Fintech Expert', color: '#20B2AA', emoji: '💳', hoist: false },

    // Rôles de participation
    { name: '🏆 Champion', color: '#FFD700', emoji: '🏆', hoist: false },
    { name: '🎯 Actif', color: '#90EE90', emoji: '🎯', hoist: false },
    { name: '📱 Mobile', color: '#87CEEB', emoji: '📱', hoist: false },

    // Rôles de statut de base
    { name: '👤 Membre', color: '#808080', emoji: '👤', hoist: false },
    { name: '🤖 Bot', color: '#FF00FF', emoji: '🤖', hoist: true },
  ];

  for (const roleData of roles) {
    try {
      const existing = guild.roles.cache.find(r => r.name === roleData.name);
      if (!existing) {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: true,
        });
        console.log(`✅ Rôle créé: ${roleData.name}`);
      }
    } catch (error) {
      console.error(`❌ Erreur rôle ${roleData.name}:`, error.message);
    }
  }
}

async function createCategoriesAndChannels(guild) {
  const structure = {
    '📢 ACCUEIL & INFORMATION': [
      { name: 'bienvenue', description: '🎉 Bienvenue sur InvestKit!' },
      { name: 'annonces-importantes', description: '📢 Annonces officielles du serveur' },
      { name: 'regles-et-faq', description: '📋 Règles et FAQ' },
      { name: 'updates', description: '🔄 Mise à jour des fonctionnalités' },
      { name: 'sondages', description: '🗳️ Sondages de la communauté' },
    ],

    '💼 DIRECTION & ÉQUIPE': [
      { name: 'equipe-leadership', description: '👥 Équipe de direction' },
      { name: 'reunions-equipe', description: '🤝 Réunions d\'équipe' },
      { name: 'decisions-strategiques', description: '🎯 Décisions stratégiques' },
      { name: 'rapports-activites', description: '📊 Rapports d\'activités' },
    ],

    '💰 INVESTISSEMENT & STRATÉGIE': [
      { name: 'investissement-general', description: '💡 Discussions d\'investissement général' },
      { name: 'portfolio-analysis', description: '📊 Analyse de portefeuille' },
      { name: 'strategie-investissement', description: '🎯 Stratégies d\'investissement' },
      { name: 'risque-gestion', description: '⚠️ Gestion des risques' },
      { name: 'diversification', description: '🔀 Diversification d\'actifs' },
      { name: 'long-terme', description: '📅 Investissements long terme' },
      { name: 'court-terme', description: '⚡ Trading court terme' },
    ],

    '🪙 CRYPTO & BLOCKCHAIN': [
      { name: 'crypto-general', description: '🪙 Discussions crypto général' },
      { name: 'bitcoin', description: '₿ Bitcoin & Lightning Network' },
      { name: 'ethereum', description: 'Ξ Ethereum & Smart Contracts' },
      { name: 'altcoins', description: '💫 Altcoins & Tokens' },
      { name: 'defi', description: '🏦 DeFi & Yield Farming' },
      { name: 'nft-web3', description: '🎨 NFT & Web3' },
      { name: 'cold-hot-wallet', description: '🔐 Wallets & Sécurité' },
    ],

    '📈 BOURSE & PEA': [
      { name: 'bourse-general', description: '📈 Discussions bourse général' },
      { name: 'actions-françaises', description: '🇫🇷 Actions françaises (CAC 40)' },
      { name: 'actions-europeennes', description: '🇪🇺 Actions européennes' },
      { name: 'actions-americaines', description: '🇺🇸 Actions américaines (S&P 500)' },
      { name: 'pea-plan-epargne', description: '💼 PEA & Plan d\'épargne' },
      { name: 'trackers-etf', description: '🎯 Trackers & ETF' },
      { name: 'dividendes', description: '💸 Stratégie de dividendes' },
    ],

    '🏠 IMMOBILIER & REITS': [
      { name: 'immobilier-general', description: '🏠 Immobilier général' },
      { name: 'achat-vente', description: '🔑 Achat-Vente immobilier' },
      { name: 'rental-income', description: '🏘️ Revenus locatifs' },
      { name: 'reits-immobilier', description: '📊 REITs & Immobilier financier' },
      { name: 'renovation-flip', description: '🔨 Rénovation & Flipping' },
      { name: 'immobilier-luxe', description: '👑 Immobilier de prestige' },
    ],

    '💳 OBLIGATIONS & TAUX FIXES': [
      { name: 'obligations', description: '📋 Obligations & titres de créance' },
      { name: 'livrets-depargne', description: '💰 Livrets & Épargne' },
      { name: 'obligations-etrangeres', description: '🌍 Obligations étrangères' },
      { name: 'crowdfunding', description: '👥 Crowdfunding & P2P Lending' },
    ],

    '📊 TRADING & TECHNIQUE': [
      { name: 'trading-general', description: '⚡ Trading général' },
      { name: 'analyse-technique', description: '📈 Analyse technique' },
      { name: 'analyse-fondamentale', description: '🔍 Analyse fondamentale' },
      { name: 'signaux-trading', description: '🚨 Signaux & Alertes' },
      { name: 'day-trading', description: '☀️ Day Trading' },
      { name: 'swing-trading', description: '🌊 Swing Trading' },
      { name: 'forex-cfd', description: '💱 Forex & CFD' },
    ],

    '🎓 ÉDUCATION & APPRENTISSAGE': [
      { name: 'cours-debutant', description: '🌱 Cours pour débutants' },
      { name: 'cours-intermediaire', description: '📚 Cours intermédiaire' },
      { name: 'cours-avance', description: '🎓 Cours avancé' },
      { name: 'webinaires-conferences', description: '🎥 Webinaires & Conférences' },
      { name: 'ressources-externes', description: '📖 Ressources externes' },
      { name: 'quiz-challenges', description: '🏆 Quiz & Challenges' },
      { name: 'glossaire-finance', description: '📖 Glossaire financier' },
    ],

    '📊 STATISTIQUES & DONNÉES': [
      { name: 'indices-marche', description: '📊 Indices de marché' },
      { name: 'donnees-economiques', description: '📈 Données économiques' },
      { name: 'crypto-prices', description: '💹 Prix crypto en temps réel' },
      { name: 'stocks-prices', description: '💱 Prix actions en temps réel' },
      { name: 'calendrier-economique', description: '📅 Calendrier économique' },
    ],

    '👥 COMMUNAUTÉ & SOCIAL': [
      { name: 'introductions', description: '👋 Présentez-vous!' },
      { name: 'selection-roles', description: '🎭 Sélection des rôles' },
      { name: 'general', description: '💬 Discussions générales' },
      { name: 'meetups-rencontres', description: '🤝 Meetups & Rencontres' },
      { name: 'events-competitions', description: '🏆 Événements & Compétitions' },
      { name: 'showcase-portfolio', description: '✨ Showcase de portefeuille' },
      { name: 'success-stories', description: '🎉 Success Stories' },
    ],

    '💬 DISCUSSIONS & DÉBATS': [
      { name: 'actualites-finance', description: '📰 Actualités financières' },
      { name: 'debat-opinion', description: '🗣️ Débats & Opinions' },
      { name: 'erreurs-apprentissage', description: '⚠️ Erreurs & Leçons apprises' },
      { name: 'off-topic', description: '😄 Hors sujet' },
      { name: 'memes-humour', description: '😂 Memes & Humour' },
    ],

    '🆘 SUPPORT & AIDE': [
      { name: 'support-general', description: '🆘 Support général' },
      { name: 'signalement-bugs', description: '🐛 Signalement de bugs' },
      { name: 'suggestions', description: '💡 Suggestions & Feedback' },
      { name: 'questions-techniques', description: '⚙️ Questions techniques' },
      { name: 'troubleshooting', description: '🔧 Dépannage' },
    ],

    '🎯 PROJETS & INITIATIVES': [
      { name: 'projets-collectifs', description: '🚀 Projets collectifs' },
      { name: 'trading-simulator', description: '🎮 Simulateurs de trading' },
      { name: 'investment-challenge', description: '💪 Challenges d\'investissement' },
      { name: 'portfolio-tracking', description: '📊 Suivi de portefeuille' },
    ],

    '🏆 CLASSEMENTS & RÉCOMPENSES': [
      { name: 'leaderboard', description: '🥇 Classement général' },
      { name: 'badges-achievements', description: '🎖️ Badges & Réussites' },
      { name: 'monthly-winners', description: '🏅 Gagnants du mois' },
      { name: 'rewards-shop', description: '🎁 Récompenses & Shop' },
    ],

    '🔐 MODÉRATION & LOGS': [
      { name: 'mod-logs', description: '📋 Logs de modération' },
      { name: 'mod-actions', description: '⚠️ Actions de modération' },
      { name: 'reports', description: '📢 Signalements' },
      { name: 'mod-discussion', description: '🛡️ Discussion modération' },
    ],
  };

  for (const [categoryName, channels] of Object.entries(structure)) {
    try {
      let category = guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildCategory && ch.name === categoryName
      );

      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
        console.log(`✅ Catégorie créée: ${categoryName}`);
      }

      for (const channelData of channels) {
        try {
          const existing = guild.channels.cache.find(
            ch => ch.name === channelData.name && ch.parent?.id === category.id
          );

          if (!existing) {
            await guild.channels.create({
              name: channelData.name,
              type: ChannelType.GuildText,
              parent: category.id,
              topic: channelData.description,
            });
            console.log(`  ✅ Canal créé: #${channelData.name}`);
          }
        } catch (error) {
          console.error(`  ❌ Erreur canal ${channelData.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur catégorie ${categoryName}:`, error.message);
    }
  }
}

async function configurePermissions(guild) {
  try {
    const everyoneRole = guild.roles.everyone;
    const memberRole = guild.roles.cache.find(r => r.name === '👤 Membre');
    const modRole = guild.roles.cache.find(r => r.name === '👮 Modérateur');
    const adminRole = guild.roles.cache.find(r => r.name === '🛡️ Administrateur');

    // Configurer les permissions globales
    if (memberRole) {
      await memberRole.setPermissions([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Connect,
      ]);
    }

    console.log('✅ Permissions configurées');
  } catch (error) {
    console.error('❌ Erreur permissions:', error.message);
  }
}

async function postWelcomeMessages(guild) {
  try {
    const welcomeChannel = guild.channels.cache.find(ch => ch.name === 'bienvenue');
    if (!welcomeChannel) return;

    const messages = await welcomeChannel.messages.fetch({ limit: 5 });
    if (messages.some(m => m.author.id === guild.client.user.id)) return;

    const embed1 = new EmbedBuilder()
      .setColor('#00AA00')
      .setTitle('🎉 Bienvenue sur InvestKit!')
      .setDescription(
        '**Bienvenue dans la plus grande communauté d\'investissement francophone!**\n\n' +
        'Nous sommes ravis de t\'accueillir. Cette plateforme est dédiée à l\'investissement, ' +
        'au trading, et à l\'éducation financière.\n\n' +
        '🚀 Avec plus de **50 canaux** organisés et **20+ rôles**, tu trouveras certainement ce que tu cherches!'
      )
      .setThumbnail(guild.client.user.displayAvatarURL());

    const embed2 = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📚 Premiers Pas')
      .addFields(
        { name: '1️⃣ Lis les règles', value: 'Consulte <#regles-et-faq>', inline: false },
        { name: '2️⃣ Choisis tes rôles', value: 'Va dans <#selection-roles>', inline: false },
        { name: '3️⃣ Présente-toi', value: 'Dis bonjour dans <#introductions>', inline: false },
        { name: '4️⃣ Explore', value: 'Plus de 50 canaux t\'attendent!', inline: false }
      );

    const embed3 = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('⭐ Domaines de Spécialisation')
      .addFields(
        { name: '💰 Investissement', value: '7 canaux dédiés', inline: true },
        { name: '🪙 Crypto', value: '7 canaux dédiés', inline: true },
        { name: '📈 Bourse', value: '7 canaux dédiés', inline: true },
        { name: '🏠 Immobilier', value: '6 canaux dédiés', inline: true },
        { name: '📊 Trading', value: '7 canaux dédiés', inline: true },
        { name: '🎓 Éducation', value: '7 canaux dédiés', inline: true }
      )
      .addFields(
        { name: '\n🎯 20+ Rôles', value: 'Rôles spécialisés pour chaque profil', inline: false }
      );

    await welcomeChannel.send({ embeds: [embed1] });
    await welcomeChannel.send({ embeds: [embed2] });
    await welcomeChannel.send({ embeds: [embed3] });

    // Message de sélection des rôles
    const rolesChannel = guild.channels.cache.find(ch => ch.name === 'selection-roles');
    if (rolesChannel) {
      const rolesEmbed = new EmbedBuilder()
        .setColor('#00AA00')
        .setTitle('🎭 Choisissez Vos Rôles')
        .setDescription('Sélectionnez les rôles qui correspondent à votre profil pour accéder aux canaux pertinents');

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('role_investor')
            .setLabel('Investisseur')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰'),
          new ButtonBuilder()
            .setCustomId('role_trader')
            .setLabel('Trader')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📊'),
          new ButtonBuilder()
            .setCustomId('role_learner')
            .setLabel('Apprenant')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎓')
        );

      await rolesChannel.send({ embeds: [rolesEmbed], components: [row] });
    }

    console.log('✅ Messages de bienvenue postés');
  } catch (error) {
    console.error('❌ Erreur messages:', error.message);
  }
}
