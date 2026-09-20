import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Faire une annonce (Admin seulement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('titre')
        .setDescription('Titre de l\'annonce')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('contenu')
        .setDescription('Contenu de l\'annonce')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal où poster l\'annonce')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
        ephemeral: true,
      });
      return;
    }

    const title = interaction.options.getString('titre');
    const content = interaction.options.getString('contenu');
    const channel = interaction.options.getChannel('canal') || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor('#FF00FF')
      .setTitle(`📢 ${title}`)
      .setDescription(content)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setFooter({ text: 'InvestKit - Annonce Officielle' })
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({
        content: `✅ Annonce postée avec succès dans ${channel}!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: '❌ Erreur lors de la publication de l\'annonce.',
        ephemeral: true,
      });
    }
  },
};
