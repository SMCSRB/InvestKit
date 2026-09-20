import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Accédez aux ressources d\'apprentissage')
    .addStringOption(option =>
      option.setName('niveau')
        .setDescription('Niveau d\'apprentissage')
        .setRequired(false)
        .addChoices(
          { name: 'Débutant', value: 'beginner' },
          { name: 'Intermédiaire', value: 'intermediate' },
          { name: 'Avancé', value: 'advanced' }
        )
    ),
  cooldown: 3,
  execute(interaction) {
    const level = interaction.options.getString('niveau') || 'beginner';

    const courses = {
      beginner: [
        {
          title: 'Les Bases de l\'Investissement',
          description: 'Comprendre les concepts fondamentaux d\'investissement',
          duration: '2 heures',
        },
        {
          title: 'Types d\'Actifs: Actions, Obligations, Crypto',
          description: 'Explorer les différentes classes d\'actifs',
          duration: '3 heures',
        },
        {
          title: 'Gestion des Risques pour Débutants',
          description: 'Apprendre à identifier et gérer les risques',
          duration: '2.5 heures',
        },
      ],
      intermediate: [
        {
          title: 'Analyse Technique Avancée',
          description: 'Maîtriser l\'analyse des graphiques et des tendances',
          duration: '4 heures',
        },
        {
          title: 'Portfolio Diversification',
          description: 'Construire un portefeuille équilibré',
          duration: '3 heures',
        },
        {
          title: 'Stratégies de Trading',
          description: 'Développer vos propres stratégies de trading',
          duration: '5 heures',
        },
      ],
      advanced: [
        {
          title: 'Dérivés Financiers & Options',
          description: 'Comprendre les produits financiers complexes',
          duration: '6 heures',
        },
        {
          title: 'Analyse Quantitative',
          description: 'Utiliser la data pour prendre des décisions',
          duration: '8 heures',
        },
        {
          title: 'Gestion de Fonds d\'Investissement',
          description: 'Gérer un portefeuille professionnel',
          duration: '7 heures',
        },
      ],
    };

    const levelLabel = level === 'beginner' ? 'Débutant' : level === 'intermediate' ? 'Intermédiaire' : 'Avancé';
    const courseList = courses[level];

    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle(`🎓 Ressources d'Apprentissage - Niveau ${levelLabel}`)
      .setDescription(`Découvrez nos cours passionnants pour le niveau ${levelLabel}`);

    courseList.forEach((course, index) => {
      embed.addFields({
        name: `${index + 1}. ${course.title}`,
        value: `${course.description}\n⏱️ Durée: ${course.duration}`,
        inline: false,
      });
    });

    embed
      .setThumbnail('https://via.placeholder.com/150')
      .setFooter({ text: 'InvestKit Academy' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
