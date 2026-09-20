import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles'),
  cooldown: 3,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('📚 Centre d\'Aide InvestKit')
      .setDescription('Voici toutes les commandes disponibles sur ce serveur')
      .addFields(
        {
          name: '💰 Commandes Financières',
          value: '`/calcul-roi` - Calcule le ROI d\'un investissement\n`/calcul-interet` - Calcule les intérêts composés',
          inline: false,
        },
        {
          name: '📊 Commandes d\'Information',
          value: '`/price` - Récupère le prix d\'une crypto\n`/news` - Affiche les dernières news',
          inline: false,
        },
        {
          name: '👥 Commandes Communautaires',
          value: '`/profil` - Affiche votre profil\n`/leaderboard` - Classement des utilisateurs\n`/stats` - Affiche les statistiques',
          inline: false,
        },
        {
          name: '🎓 Commandes Éducation',
          value: '`/learn` - Accéder aux ressources d\'apprentissage\n`/quiz` - Participer à un quiz',
          inline: false,
        },
        {
          name: '⚙️ Commandes Admin',
          value: '`/setup` - Configure le serveur\n`/announce` - Faire une annonce',
          inline: false,
        }
      )
      .setFooter({ text: 'Utilisez /[commande] pour plus d\'informations' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
