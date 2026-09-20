import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des meilleurs investisseurs'),
  cooldown: 5,
  async execute(interaction) {
    const leaderboardData = [
      { rank: 1, username: 'InvestorPro', score: 4500, roi: 145 },
      { rank: 2, username: 'MoneyMaker', score: 4200, roi: 132 },
      { rank: 3, username: 'WealthBuilder', score: 3850, roi: 125 },
      { rank: 4, username: 'MarketGuru', score: 3600, roi: 118 },
      { rank: 5, username: 'TradeKing', score: 3200, roi: 105 },
      { rank: 6, username: 'CryptoNinja', score: 2950, roi: 98 },
      { rank: 7, username: 'FinanceGeek', score: 2700, roi: 92 },
      { rank: 8, username: 'InvestSmart', score: 2450, roi: 85 },
      { rank: 9, username: 'RiskTaker', score: 2100, roi: 78 },
      { rank: 10, username: 'NewInvestor', score: 1850, roi: 65 },
    ];

    const medals = ['🥇', '🥈', '🥉'];
    let leaderboardText = '';

    leaderboardData.forEach((entry) => {
      const medal = entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`;
      leaderboardText += `${medal} **${entry.username}** - ${entry.score} pts (ROI: ${entry.roi}%)\n`;
    });

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Leaderboard des Investisseurs')
      .setDescription(leaderboardText)
      .addFields({
        name: 'Système de Points',
        value: 'Les points sont attribués selon vos performances d\'investissement et vos activités sur le serveur.',
        inline: false,
      })
      .setThumbnail('https://via.placeholder.com/150')
      .setFooter({ text: 'Leaderboard mis à jour automatiquement' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
