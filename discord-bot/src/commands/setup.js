import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure complètement le serveur (Admin seulement)')
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
    let successCount = 0;
    let errorCount = 0;

    try {
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚙️ Configuration en cours...')
        .setDescription('Patience, mise en place complète du serveur');

      await interaction.editReply({ embeds: [embed] });

      // 1. Créer les rôles
      const roles = [
        { name: 'Investisseur', color: '#FFD700' },
        { name: 'Trader', color: '#FF6347' },
        { name: 'Apprenant', color: '#00AA00' },
        { name: 'Modérateur', color: '#0099FF' },
        { name: 'Membre', color: '#808080' },
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
            successCount++;
            console.log(`✅ Rôle créé: ${roleData.name}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur création rôle ${roleData.name}:`, error.message);
        }
      }

      // 2. Créer les catégories et canaux
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
          let category = guild.channels.cache.find(
            ch => ch.isCategory() && ch.name === categoryName
          );

          if (!category) {
            category = await guild.channels.create({
              name: categoryName,
              type: ChannelType.GuildCategory,
            });
            successCount++;
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
                successCount++;
                console.log(`✅ Canal créé: #${channelData.name}`);
              }
            } catch (error) {
              errorCount++;
              console.error(`❌ Erreur canal ${channelData.name}:`, error.message);
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur catégorie ${categoryName}:`, error.message);
        }
      }

      // 3. Poster les messages de bienvenue
      try {
        const welcomeChannel = guild.channels.cache.find(ch => ch.name === 'bienvenue');
        if (welcomeChannel) {
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#00AA00')
            .setTitle('🎉 Bienvenue sur InvestKit!')
            .setDescription(
              '**Bienvenue dans la plus grande communauté d\'investissement francophone!**\n\n' +
              'Cette plateforme est dédiée à l\'investissement, au trading, et à l\'éducation financière.'
            )
            .addFields(
              { name: '1️⃣ Lis les règles', value: 'Consulte <#regles>', inline: false },
              { name: '2️⃣ Choisis tes rôles', value: 'Va dans <#roles>', inline: false },
              { name: '3️⃣ Présente-toi', value: 'Dis bonjour dans <#introductions>', inline: false },
              { name: '💡 Commandes', value: '`/help` - Aide | `/learn` - Ressources | `/profil` - Ton profil', inline: false }
            )
            .setFooter({ text: 'InvestKit - Investissez Malin 📈' })
            .setTimestamp();

          await welcomeChannel.send({ embeds: [welcomeEmbed] });
          successCount++;
        }
      } catch (error) {
        console.error('❌ Erreur message bienvenue:', error.message);
      }

      // 4. Poster le message de sélection des rôles
      try {
        const rolesChannel = guild.channels.cache.find(ch => ch.name === 'roles');
        if (rolesChannel) {
          const rolesEmbed = new EmbedBuilder()
            .setColor('#00AA00')
            .setTitle('🎭 Choisissez Votre Rôle')
            .setDescription('Sélectionnez les rôles qui correspondent à vos intérêts');

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
          successCount++;
        }
      } catch (error) {
        console.error('❌ Erreur message rôles:', error.message);
      }

      // Message final
      const finalEmbed = new EmbedBuilder()
        .setColor('#00AA00')
        .setTitle('✅ Configuration Complète!')
        .setDescription('Votre serveur est maintenant opérationnel!')
        .addFields(
          { name: '✅ Succès', value: `${successCount} éléments créés`, inline: true },
          { name: '⚠️ Erreurs', value: `${errorCount} erreurs`, inline: true },
          { name: '📊 Résumé', value: '5 rôles + 6 catégories + 20 canaux créés', inline: false },
          { name: '🚀 Prêt', value: 'Le serveur est maintenant opérationnel!', inline: false }
        )
        .setFooter({ text: 'InvestKit Setup - Terminé' })
        .setTimestamp();

      await interaction.editReply({ embeds: [finalEmbed] });

      console.log(`\n🎉 Serveur ${guild.name} configuré avec succès!\n`);
    } catch (error) {
      console.error('❌ Erreur générale setup:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur Configuration')
            .setDescription('Une erreur est survenue lors de la configuration.')
            .addFields({ name: 'Erreur', value: error.message })
        ],
      });
    }
  },
};
