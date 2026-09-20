export default {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot connecté en tant que ${client.user.username}`);

    client.user.setActivity('InvestKit - Investissez Malin 📈', {
      type: 'WATCHING',
    });

    console.log(`🚀 Bot prêt pour ${client.guilds.cache.size} serveur(s)`);
  },
};
