import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  name: 'guildCreate',
  async execute(guild) {
    console.log(`🆕 Bot ajouté au serveur: ${guild.name}`);

    try {
      await setupGuild(guild);
    } catch (error) {
      console.error(`❌ Erreur lors de la configuration de ${guild.name}:`, error);
    }
  },
};

async function setupGuild(guild) {
  console.log(`⚙️ Configuration automatique du serveur ${guild.name}...`);

  // 1. Créer les rôles
  await createRoles(guild);

  // 2. Créer les catégories et canaux
  await createChannels(guild);

  // 3. Poster le message de bienvenue
  await postWelcomeMessage(guild);

  console.log(`✅ Configuration complète du serveur ${guild.name}!`);
}

async function createRoles(guild) {
  const roles = [
    { name: 'Investisseur', color: '#FFD700', emoji: '💰' },
    { name: 'Trader', color: '#FF6347', emoji: '📊' },
    { name: 'Apprenant', color: '#00AA00', emoji: '🎓' },
    { name: 'Modérateur', color: '#0099FF', emoji: '🛡️' },
    { name: 'Membre', color: '#808080', emoji: '👤' },
  ];

  for (const roleData of roles) {
    try {
      const existing = guild.roles.cache.find(r => r.name === roleData.name);
      if (!existing) {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          mentionable: true,
        });
        console.log(`✅ Rôle créé: ${roleData.name}`);
      } else {
        console.log(`⏭️ Rôle existant: ${roleData.name}`);
      }
    } catch (error) {
      console.error(`❌ Erreur création rôle ${roleData.name}:`, error.message);
    }
  }
}

async function createChannels(guild) {
  // Structure des canaux par catégorie
  const categories = {
    '📋 INFORMATION': [
      { name: 'bienvenue', description: 'Bienvenue sur InvestKit!' },
      { name: 'regles', description: 'Les règles du serveur' },
      { name: 'annonces', description: 'Annonces officielles' },
    ],
    '💰 INVESTISSEMENT': [
      { name: 'investissement', description: 'Discussions d\'investissement' },
      { name: 'crypto', description: 'Discussions crypto' },
      { name: 'bourse', description: 'Discussions bourse/PEA' },
      { name: 'immobilier', description: 'Discussions immobilier' },
    ],
    '📊 TRADING': [
      { name: 'trading', description: 'Discussions de trading' },
      { name: 'analyse-technique', description: 'Analyse technique' },
      { name: 'signaux', description: 'Signaux et alertes' },
    ],
    '🎓 ÉDUCATION': [
      { name: 'cours', description: 'Ressources et cours' },
      { name: 'quiz', description: 'Quizzes et défis' },
      { name: 'ressources', description: 'Liens et ressources utiles' },
    ],
    '🎭 COMMUNAUTÉ': [
      { name: 'introductions', description: 'Présentez-vous!' },
      { name: 'roles', description: 'Sélectionnez vos rôles' },
      { name: 'general', description: 'Discussions générales' },
      { name: 'off-topic', description: 'Hors sujet' },
    ],
    '🤖 BOT': [
      { name: 'commandes-bot', description: 'Utilisez les commandes ici' },
      { name: 'logs', description: 'Logs du bot' },
    ],
  };

  for (const [categoryName, channels] of Object.entries(categories)) {
    try {
      // Créer ou récupérer la catégorie
      let category = guild.channels.cache.find(
        ch => ch.isCategory() && ch.name === categoryName
      );

      if (!category) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
        console.log(`✅ Catégorie créée: ${categoryName}`);
      } else {
        console.log(`⏭️ Catégorie existante: ${categoryName}`);
      }

      // Créer les canaux de la catégorie
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
              permissionOverwrites: getPermissions(guild, channelData.name),
            });
            console.log(`  ✅ Canal créé: #${channelData.name}`);
          } else {
            console.log(`  ⏭️ Canal existant: #${channelData.name}`);
          }
        } catch (error) {
          console.error(`  ❌ Erreur création canal ${channelData.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur catégorie ${categoryName}:`, error.message);
    }
  }
}

function getPermissions(guild, channelName) {
  const everyoneRole = guild.roles.everyone;
  const modRole = guild.roles.cache.find(r => r.name === 'Modérateur');
  const botRole = guild.members.me?.roles.highest;

  const basePermissions = {
    [everyoneRole.id]: {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    },
  };

  // Canaux restreints
  if (channelName === 'regles') {
    basePermissions[everyoneRole.id].SendMessages = false;
  }

  if (channelName === 'annonces') {
    basePermissions[everyoneRole.id].SendMessages = false;
  }

  if (channelName === 'roles') {
    basePermissions[everyoneRole.id].SendMessages = false;
  }

  if (channelName === 'logs') {
    basePermissions[everyoneRole.id].ViewChannel = false;
    if (modRole) {
      basePermissions[modRole.id] = {
        ViewChannel: true,
        ReadMessageHistory: true,
      };
    }
  }

  return Object.entries(basePermissions).map(([roleId, permissions]) => ({
    id: roleId,
    type: 'role',
    allow: Object.keys(permissions)
      .filter(perm => permissions[perm])
      .map(perm => PermissionFlagsBits[perm])
      .filter(Boolean),
  }));
}

async function postWelcomeMessage(guild) {
  try {
    const welcomeChannel = guild.channels.cache.find(ch => ch.name === 'bienvenue');
    if (!welcomeChannel) return;

    // Vérifier si le message existe déjà
    const messages = await welcomeChannel.messages.fetch({ limit: 10 });
    if (messages.some(m => m.author.id === guild.client.user.id && m.embeds.length > 0)) {
      console.log('⏭️ Message de bienvenue déjà présent');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#00AA00')
      .setTitle('🎉 Bienvenue sur InvestKit!')
      .setDescription(
        '**Bienvenue dans la plus grande communauté d\'investissement francophone!**\n\n' +
        'Nous sommes ravis de t\'accueillir. Cette plateforme est dédiée à l\'investissement, ' +
        'au trading, et à l\'éducation financière.\n\n' +
        '📚 **Pour commencer:**'
      )
      .addFields(
        {
          name: '1️⃣ Lis les règles',
          value: 'Consulte <#regles> pour connaître les règles du serveur',
          inline: false,
        },
        {
          name: '2️⃣ Choisis tes rôles',
          value: 'Va dans <#roles> pour sélectionner tes domaines d\'intérêt',
          inline: false,
        },
        {
          name: '3️⃣ Présente-toi',
          value: 'Dis bonjour dans <#introductions>',
          inline: false,
        },
        {
          name: '4️⃣ Explore',
          value: 'Rejoins les discussions qui t\'intéressent',
          inline: false,
        }
      )
      .addFields(
        {
          name: '💡 Commandes utiles',
          value: '`/help` - Affiche toutes les commandes\n`/profil` - Vois ton profil\n`/learn` - Accès aux ressources',
          inline: false,
        }
      )
      .setThumbnail(guild.client.user.displayAvatarURL())
      .setFooter({ text: 'InvestKit - Investissez Malin 📈' })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
    console.log('✅ Message de bienvenue posté');
  } catch (error) {
    console.error('❌ Erreur posting message de bienvenue:', error.message);
  }
}
