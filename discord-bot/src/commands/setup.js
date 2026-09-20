import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure les salons du serveur (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    try {
      // Créer les salons
      const channels = [
        { name: 'bienvenue', description: 'Canal de bienvenue', type: ChannelType.GuildText },
        { name: '📋-regles', description: 'Les règles du serveur', type: ChannelType.GuildText },
        { name: '🎭-roles', description: 'Sélectionner vos rôles', type: ChannelType.GuildText },
        { name: '💰-investissement', description: 'Discussions d\'investissement', type: ChannelType.GuildText },
        { name: '📊-trading', description: 'Discussions de trading', type: ChannelType.GuildText },
        { name: '🎓-education', description: 'Ressources d\'apprentissage', type: ChannelType.GuildText },
        { name: '📰-news', description: 'Actualités financières', type: ChannelType.GuildText },
        { name: '🤖-bot', description: 'Commandes du bot', type: ChannelType.GuildText },
      ];

      for (const ch of channels) {
        const existing = guild.channels.cache.find(c => c.name === ch.name);
        if (!existing) {
          await guild.channels.create({
            name: ch.name,
            type: ch.type,
            topic: ch.description,
          });
          console.log(`✅ Canal créé: ${ch.name}`);
        }
      }

      // Créer les rôles
      const roles = [
        { name: 'Investisseur', color: '#FFD700' },
        { name: 'Trader', color: '#FF6347' },
        { name: 'Apprenant', color: '#00AA00' },
        { name: 'Modérateur', color: '#0099FF' },
      ];

      for (const role of roles) {
        const existing = guild.roles.cache.find(r => r.name === role.name);
        if (!existing) {
          await guild.roles.create({
            name: role.name,
            color: role.color,
          });
          console.log(`✅ Rôle créé: ${role.name}`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#00AA00')
        .setTitle('✅ Configuration Terminée!')
        .setDescription('Le serveur a été configuré avec succès.')
        .addFields(
          { name: 'Salons créés', value: `${channels.length} nouveaux salons`, inline: true },
          { name: 'Rôles créés', value: `${roles.length} nouveaux rôles`, inline: true },
        )
        .setFooter({ text: 'InvestKit Setup' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors de la configuration.',
      });
    }
  },
};
