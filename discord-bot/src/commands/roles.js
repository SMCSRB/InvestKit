import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Affiche le menu de sélection des rôles'),
  cooldown: 3,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#00AA00')
      .setTitle('🎭 Choisissez Votre Rôle')
      .setDescription(
        'Sélectionnez le rôle qui correspond à votre profil pour accéder aux canaux pertinents.\n\n' +
        '**Investisseur** 💰 - Intéressé par les stratégies d\'investissement\n' +
        '**Trader** 📊 - Passionné par le trading et l\'analyse technique\n' +
        '**Apprenant** 🎓 - Débutant qui souhaite apprendre'
      )
      .setThumbnail('https://via.placeholder.com/150');

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

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });
  },
};
