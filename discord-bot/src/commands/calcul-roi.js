import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('calcul-roi')
    .setDescription('Calcule le ROI (Return On Investment) d\'un investissement')
    .addNumberOption(option =>
      option.setName('montant-initial')
        .setDescription('Montant initial investi (en €)')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addNumberOption(option =>
      option.setName('montant-final')
        .setDescription('Montant final après investissement (en €)')
        .setRequired(true)
        .setMinValue(0.01)
    ),
  cooldown: 3,
  execute(interaction) {
    const initialAmount = interaction.options.getNumber('montant-initial');
    const finalAmount = interaction.options.getNumber('montant-final');

    const roi = ((finalAmount - initialAmount) / initialAmount) * 100;
    const gain = finalAmount - initialAmount;

    const embed = new EmbedBuilder()
      .setColor(roi >= 0 ? '#00AA00' : '#FF0000')
      .setTitle('📊 Calcul du ROI')
      .addFields(
        { name: 'Montant initial', value: `${initialAmount.toFixed(2)} €`, inline: true },
        { name: 'Montant final', value: `${finalAmount.toFixed(2)} €`, inline: true },
        { name: 'Gain/Perte', value: `${gain >= 0 ? '+' : ''}${gain.toFixed(2)} €`, inline: true },
        { name: 'ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`, inline: true },
      )
      .setFooter({ text: 'Calcul fourni par InvestKit' })
      .setTimestamp();

    if (roi >= 0) {
      embed.setDescription('✅ Investissement rentable!');
    } else {
      embed.setDescription('❌ Investissement déficitaire');
    }

    interaction.reply({ embeds: [embed] });
  },
};
