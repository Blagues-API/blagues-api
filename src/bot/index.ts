import { Client, CommandInteraction, Intents, Interaction } from 'discord.js';
import jokes from '../../blagues.json';
// import { AdminUsers, jokeRole, suggestsChannel, logsChannel} from './constents'
import suggestCommand from './commands/suggest';

const BlaguesAPIBot = new Client({
  partials: ['REACTION'],
  intents: Intents.FLAGS.GUILDS
});

BlaguesAPIBot.on('ready', () => {
  console.log(`${BlaguesAPIBot.user!.tag} connecté !`);

  BlaguesAPIBot.user!.setActivity(`les ${jokes.length} blagues`, {
    type: 'WATCHING'
  });
  setInterval(() => {
    BlaguesAPIBot.user!.setActivity(`les ${jokes.length} blagues`, {
      type: 'WATCHING'
    });
  }, 24 * 60 * 60 * 1000);
});

BlaguesAPIBot.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const command: CommandInteraction = interaction as CommandInteraction;

  switch (command.commandName) {
    case 'suggest':
      return suggestCommand(command);
    default:
      break;
  }
});

BlaguesAPIBot.login(process.env.BOT_TOKEN);
