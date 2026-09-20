import { ChannelType } from 'discord.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`Commande non trouvée: ${interaction.commandName}`);
        return;
      }

      const { cooldowns } = interaction.client;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1_000);
          await interaction.reply({
            content: `⏱️ Attendez <t:${expiredTimestamp}:R> avant de réutiliser cette commande.`,
            ephemeral: true,
          });
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    }
  },
};

async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  if (customId === 'role_investor') {
    await interaction.member.roles.add('ROLE_ID_INVESTOR');
    await interaction.reply({
      content: '✅ Vous avez obtenu le rôle Investisseur!',
      ephemeral: true,
    });
  } else if (customId === 'role_trader') {
    await interaction.member.roles.add('ROLE_ID_TRADER');
    await interaction.reply({
      content: '✅ Vous avez obtenu le rôle Trader!',
      ephemeral: true,
    });
  } else if (customId === 'role_learner') {
    await interaction.member.roles.add('ROLE_ID_LEARNER');
    await interaction.reply({
      content: '✅ Vous avez obtenu le rôle Apprenant!',
      ephemeral: true,
    });
  }
}

async function handleSelectMenuInteraction(interaction) {
  const values = interaction.values;
  // Gérer les sélections d'alertes, notifications, etc.
  await interaction.reply({
    content: `✅ Vos préférences ont été mises à jour: ${values.join(', ')}`,
    ephemeral: true,
  });
}
