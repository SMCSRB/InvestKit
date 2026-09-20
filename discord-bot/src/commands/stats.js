import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques du serveur'),
  cooldown: 5,
  async execute(interaction) {
    const guild = interaction.guild;
    const members = await guild.members.fetch({ limit: 0 });
    const botCount = members.filter(m => m.user.bot).size;
    const userCount = members.filter(m => !m.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle(`📊 Statistiques du Serveur ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: 'Nombre total de membres', value: `${members.size}`, inline: true },
        { name: 'Utilisateurs', value: `${userCount}`, inline: true },
        { name: 'Bots', value: `${botCount}`, inline: true },
        { name: 'Canaux texte', value: `${guild.channels.cache.filter(c => c.isTextBased()).size}`, inline: true },
        { name: 'Salons vocaux', value: `${guild.channels.cache.filter(c => c.isVoiceBased()).size}`, inline: true },
        { name: 'Rôles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Serveur créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:d>`, inline: false },
        { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: false },
        {
          name: 'Niveau de vérification',
          value: guild.verificationLevel === 0 ? 'Aucun' :
                 guild.verificationLevel === 1 ? 'Faible' :
                 guild.verificationLevel === 2 ? 'Moyen' :
                 guild.verificationLevel === 3 ? 'Élevé' : 'Très élevé',
          inline: true,
        },
      )
      .setFooter({ text: 'InvestKit - Communauté d\'Investissement' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
