import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-advanced')
    .setDescription('Setup complet du serveur (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild;
    let roleCount = 0;
    let categoryCount = 0;
    let channelCount = 0;

    try {
      // 1. Créer les rôles
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚙️ Configuration en cours...')
            .setDescription('**Étape 1/3: Création des rôles...**')
        ],
      });

      const roles = [
        '👑 Propriétaire',
        '🔱 Co-Propriétaire',
        '🛡️ Administrateur',
        '👮 Modérateur',
        '💎 VIP Premium',
        '⭐ VIP Gold',
        '💰 Investisseur',
        '📊 Trader',
        '🎓 Apprenant',
        '🔐 Crypto Expert',
        '🏦 Immobilier Expert',
        '📈 Bourse Expert',
        '🏆 Champion',
        '🎯 Actif',
        '👤 Membre',
      ];

      const colors = [
        '#FF0000', '#DC143C', '#FF6347', '#FFD700', '#E600FF',
        '#FFD700', '#00AA00', '#0099FF', '#00FF00', '#FF8C00',
        '#8B4513', '#4169E1', '#FFD700', '#90EE90', '#808080',
      ];

      for (let i = 0; i < roles.length; i++) {
        try {
          const existing = guild.roles.cache.find(r => r.name === roles[i]);
          if (!existing) {
            await guild.roles.create({
              name: roles[i],
              color: colors[i],
              hoist: true,
              mentionable: true,
            });
            roleCount++;
            console.log(`✅ Rôle: ${roles[i]}`);
          }
        } catch (error) {
          console.error(`❌ Rôle ${roles[i]}:`, error.message);
        }
      }

      // 2. Créer les catégories et canaux
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('⚙️ Configuration en cours...')
            .setDescription(`**Étape 2/3: Création des canaux...**\n✅ ${roleCount} rôles créés`)
        ],
      });

      const categories = {
        '📢 ACCUEIL': ['bienvenue', 'annonces', 'regles', 'sondages'],
        '💰 INVESTISSEMENT': ['investissement', 'portfolio', 'strategie', 'risque', 'long-terme', 'court-terme'],
        '🪙 CRYPTO': ['crypto-general', 'bitcoin', 'ethereum', 'altcoins', 'defi', 'wallet', 'security'],
        '📈 BOURSE': ['bourse', 'actions-fr', 'actions-us', 'pea', 'etf', 'dividendes', 'trackers'],
        '🏠 IMMOBILIER': ['immobilier', 'achat-vente', 'location', 'reits', 'renovation', 'prestige'],
        '📊 TRADING': ['trading', 'analyse-tech', 'analyse-fund', 'signaux', 'day-trading', 'swing-trading', 'forex'],
        '🎓 ÉDUCATION': ['cours-debutant', 'cours-inter', 'cours-avance', 'webinaires', 'ressources', 'quiz', 'glossaire'],
        '👥 COMMUNAUTÉ': ['introductions', 'roles', 'general', 'events', 'showcase', 'success-stories', 'meetups'],
        '💬 DÉBATS': ['actualites', 'debats', 'erreurs', 'off-topic', 'humour'],
        '🆘 SUPPORT': ['support', 'bugs', 'suggestions', 'technique', 'troubleshooting'],
        '🏆 RÉCOMPENSES': ['leaderboard', 'badges', 'winners', 'shop'],
        '🔐 MODÉRATION': ['mod-logs', 'mod-actions', 'reports', 'mod-discussion'],
      };

      console.log('🔍 Début création catégories et canaux...');
      console.log(`📊 Nombre de catégories à créer: ${Object.keys(categories).length}`);

      for (const [categoryName, channels] of Object.entries(categories)) {
        console.log(`\n🔍 Traitement catégorie: ${categoryName}`);
        try {
          // Créer la catégorie
          let category = guild.channels.cache.find(
            ch => ch.isCategory() && ch.name === categoryName
          );

          if (!category) {
            console.log(`  → Création de la catégorie: ${categoryName}`);
            category = await guild.channels.create({
              name: categoryName,
              type: ChannelType.GuildCategory,
            });
            categoryCount++;
            console.log(`  ✅ Catégorie créée: ${categoryName} (ID: ${category.id})`);
          } else {
            console.log(`  ℹ️ Catégorie existe déjà: ${categoryName}`);
          }

          // Créer les canaux
          console.log(`  → Création de ${channels.length} canaux...`);
          for (const channelName of channels) {
            try {
              const existing = guild.channels.cache.find(
                ch => ch.name === channelName && ch.parent?.id === category.id
              );

              if (!existing) {
                await guild.channels.create({
                  name: channelName,
                  type: ChannelType.GuildText,
                  parent: category.id,
                });
                channelCount++;
                console.log(`    ✅ Canal créé: #${channelName}`);
              } else {
                console.log(`    ℹ️ Canal existe déjà: #${channelName}`);
              }
            } catch (error) {
              console.error(`    ❌ Erreur canal ${channelName}:`, error.message);
              console.error(`       Code: ${error.code}, Détails:`, error);
            }
          }
        } catch (error) {
          console.error(`❌ Erreur catégorie ${categoryName}:`, error.message);
          console.error(`   Code: ${error.code}, Détails:`, error);
        }
      }

      console.log(`\n✅ Création des catégories et canaux terminée: ${categoryCount} catégories, ${channelCount} canaux`);

      // 3. Message final
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00AA00')
            .setTitle('✅ Configuration Complète!')
            .setDescription('Votre serveur InvestKit est maintenant 100% opérationnel!')
            .addFields(
              { name: '🎭 Rôles créés', value: String(roleCount), inline: true },
              { name: '📂 Catégories créées', value: String(categoryCount), inline: true },
              { name: '📝 Canaux créés', value: String(channelCount), inline: true },
              { name: '🚀 Statut', value: '✅ Prêt pour la production', inline: false }
            )
            .setFooter({ text: 'InvestKit Setup - Succès!' })
            .setTimestamp()
        ],
      });

      console.log(`\n✅ Serveur ${guild.name} configuré avec succès!\n`);
    } catch (error) {
      console.error('❌ Erreur:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur Configuration')
            .setDescription(error.message)
        ],
      });
    }
  },
};
