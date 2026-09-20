import { ChannelType, EmbedBuilder } from 'discord.js';

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
  const roleNames = {
    role_investor: 'Investisseur',
    role_trader: 'Trader',
    role_learner: 'Apprenant',
  };

  if (!roleNames[customId]) {
    await interaction.reply({
      content: '❌ Ce bouton n\'est pas valide.',
      ephemeral: true,
    });
    return;
  }

  try {
    const roleName = roleNames[customId];
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
      await interaction.reply({
        content: `❌ Le rôle "${roleName}" n\'existe pas sur ce serveur.`,
        ephemeral: true,
      });
      return;
    }

    // Vérifier si l'utilisateur a déjà le rôle
    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role);
      await interaction.reply({
        content: `✅ Le rôle **${roleName}** a été retiré!`,
        ephemeral: true,
      });
    } else {
      await interaction.member.roles.add(role);
      await interaction.reply({
        content: `✅ Vous avez obtenu le rôle **${roleName}**! 🎉`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('❌ Erreur attribution rôle:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'attribution du rôle.',
      ephemeral: true,
    });
  }
}

async function handleSelectMenuInteraction(interaction) {
  const values = interaction.values;
  await interaction.reply({
    content: `✅ Vos préférences ont été mises à jour: ${values.join(', ')}`,
    ephemeral: true,
  });
}
