import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Participez à un quiz d\'investissement'),
  cooldown: 10,
  async execute(interaction) {
    const questions = [
      {
        question: 'Quel est le ROI dans le contexte de l\'investissement?',
        answer: 'Return On Investment (Retour sur Investissement)',
      },
      {
        question: 'Qu\'est-ce qu\'une action?',
        answer: 'Une part de propriété dans une entreprise',
      },
      {
        question: 'Quelle est la devise de Bitcoin?',
        answer: 'BTC',
      },
      {
        question: 'Qu\'est-ce que la diversification?',
        answer: 'Répartir les investissements sur plusieurs actifs',
      },
      {
        question: 'Qu\'est-ce qu\'un ETF?',
        answer: 'Exchange Traded Fund - un fonds négocié en bourse',
      },
    ];

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    const embed = new EmbedBuilder()
      .setColor('#FF6347')
      .setTitle('🎯 Quiz InvestKit')
      .setDescription(randomQuestion.question)
      .addFields({
        name: 'Réponse',
        value: `||${randomQuestion.answer}||`,
        inline: false,
      })
      .setFooter({ text: 'Cliquez sur le spoiler pour voir la réponse' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
