import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('news')
    .setDescription('Affiche les dernières actualités financières')
    .addStringOption(option =>
      option.setName('categorie')
        .setDescription('Catégorie des news')
        .setRequired(false)
        .addChoices(
          { name: 'Crypto', value: 'crypto' },
          { name: 'Bourse', value: 'stock' },
          { name: 'Immobilier', value: 'real_estate' },
          { name: 'Économie', value: 'economy' }
        )
    ),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();

    const category = interaction.options.getString('categorie') || 'general';

    const newsData = {
      crypto: [
        {
          title: 'Bitcoin atteint un nouveau sommet',
          description: 'Le Bitcoin dépasse les 45 000€ pour la première fois',
          source: 'CryptoNews',
        },
        {
          title: 'Ethereum 2.0 update',
          description: 'La mise à jour majeure améliore la performance de 50%',
          source: 'ETH Community',
        },
      ],
      stock: [
        {
          title: 'CAC 40 en hausse',
          description: 'Les marchés européens terminent la semaine en hausse',
          source: 'Bourse de Paris',
        },
        {
          title: 'Tesla dépasse les attentes',
          description: 'Le constructeur automobile dépassent ses objectifs de Q3',
          source: 'MarketWatch',
        },
      ],
      real_estate: [
        {
          title: 'Prix immobiliers stables',
          description: 'Le marché immobilier français stabilise ses prix',
          source: 'SeLoger',
        },
      ],
      economy: [
        {
          title: 'Taux d\'inflation en baisse',
          description: 'L\'inflation recule pour le 3e mois consécutif',
          source: 'INSEE',
        },
      ],
    };

    const news = newsData[category] || newsData.crypto;

    const embed = new EmbedBuilder()
      .setColor('#00AA00')
      .setTitle(`📰 Actualités - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
      .setDescription('Dernières actualités financières')
      .setThumbnail('https://via.placeholder.com/150');

    news.forEach((article, index) => {
      embed.addFields({
        name: `${index + 1}. ${article.title}`,
        value: `${article.description}\n*Source: ${article.source}*`,
        inline: false,
      });
    });

    embed.setFooter({ text: 'InvestKit - Actualités en temps réel' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
