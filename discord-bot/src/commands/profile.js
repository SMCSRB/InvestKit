import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche votre profil utilisateur')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir le profil (optionnel)')
        .setRequired(false)
    ),
  cooldown: 5,
  async execute(interaction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle(`Profil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: 'Pseudo Discord', value: targetUser.username, inline: true },
        { name: 'ID', value: targetUser.id, inline: true },
        { name: 'Compte créé', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:d>`, inline: true },
        { name: 'Rejoint le serveur', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:d>` : 'N/A', inline: true },
        {
          name: 'Rôles',
          value: member
            ? member.roles.cache
              .filter(r => r.name !== '@everyone')
              .map(r => r.toString())
              .join(', ') || 'Aucun rôle spécifique'
            : 'N/A',
          inline: false,
        },
      )
      .setFooter({ text: 'InvestKit - Investissez Malin 📈' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
