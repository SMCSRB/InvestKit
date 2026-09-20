import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('calcul-interet')
    .setDescription('Calcule les intérêts composés d\'un investissement')
    .addNumberOption(option =>
      option.setName('capital')
        .setDescription('Capital initial (en €)')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addNumberOption(option =>
      option.setName('taux')
        .setDescription('Taux d\'intérêt annuel (%)')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addIntegerOption(option =>
      option.setName('annees')
        .setDescription('Nombre d\'années')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addIntegerOption(option =>
      option.setName('frequence')
        .setDescription('Fréquence de capitalisation')
        .setRequired(false)
        .addChoices(
          { name: 'Annuelle', value: 1 },
          { name: 'Semestrielle', value: 2 },
          { name: 'Trimestrielle', value: 4 },
          { name: 'Mensuelle', value: 12 }
        )
    ),
  cooldown: 3,
  execute(interaction) {
    const capital = interaction.options.getNumber('capital');
    const rate = interaction.options.getNumber('taux');
    const years = interaction.options.getInteger('annees');
    const frequency = interaction.options.getInteger('frequence') || 1;

    const r = rate / 100 / frequency;
    const n = years * frequency;
    const finalAmount = capital * Math.pow(1 + r, n);
    const interest = finalAmount - capital;

    const embed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle('📈 Calcul des Intérêts Composés')
      .addFields(
        { name: 'Capital initial', value: `${capital.toFixed(2)} €`, inline: true },
        { name: 'Taux annuel', value: `${rate.toFixed(2)}%`, inline: true },
        { name: 'Période', value: `${years} ans`, inline: true },
        { name: 'Capitalisation', value: frequency === 1 ? 'Annuelle' : frequency === 2 ? 'Semestrielle' : frequency === 4 ? 'Trimestrielle' : 'Mensuelle', inline: true },
        { name: 'Intérêts gagnés', value: `${interest.toFixed(2)} €`, inline: true },
        { name: 'Montant final', value: `${finalAmount.toFixed(2)} €`, inline: true },
      )
      .setDescription(`💡 En ${years} an(s), votre investissement se transformera!`)
      .setFooter({ text: 'Calcul fourni par InvestKit' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
