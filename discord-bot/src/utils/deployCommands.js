import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

(async () => {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const { default: command } = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(token);

  try {
    console.log(`Enregistrement de ${commands.length} commandes...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`✅ ${data.length} commandes enregistrées avec succès!`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
  }
})();
