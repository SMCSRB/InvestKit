import { EmbedBuilder } from 'discord.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    const guild = member.guild;
    const welcomeChannel = guild.channels.cache.find(ch => ch.name === 'bienvenue');

    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#00AA00')
      .setTitle(`Bienvenue ${member.user.username}! 🎉`)
      .setDescription(
        `Bienvenue dans la communauté **InvestKit**!\n\n` +
        `Nous sommes ravis de t'accueillir.\n\n` +
        `📚 **Avant de commencer:**\n` +
        `• Lis les <#règles> du serveur\n` +
        `• Choisis tes rôles dans <#roles>\n` +
        `• Introduis-toi dans <#introductions>\n` +
        `• Consulte <#ressources> pour apprendre`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'InvestKit - Investissez Malin 📈' })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });

    // Assigner le rôle "Member" par défaut
    const memberRole = guild.roles.cache.find(r => r.name === 'Membre');
    if (memberRole) {
      await member.roles.add(memberRole).catch(err => console.error(err));
    }
  },
};
