import { Client, CommandInteraction, Intents, Interaction } from 'discord.js';
import jokes from '../../blagues.json';
// import { AdminUsers, jokeRole, suggestsChannel, logsChannel} from './constents'
import suggestCommand from './commands/suggest';
export default class Bot {
  public client: Client;
  constructor() {
    this.client = new Client({
      partials: ['REACTION'],
      intents: Intents.FLAGS.GUILDS
    });

    this.client.on('ready', this.onReady.bind(this));
    this.client.on('interactionCreate', this.onInteractionCreate.bind(this));
  }



  get available(): boolean {
    return !!this.client.readyAt;
  }

  onReady(): void {
    console.log(`${this.client.user!.tag} connecté !`);

    this.client.user!.setActivity(`les ${jokes.length} blagues`, {
      type: 'WATCHING'
    });
    setInterval(() => {
      this.client.user!.setActivity(`les ${jokes.length} blagues`, {
        type: 'WATCHING'
      });
    }, 24 * 60 * 60 * 1000);
    this.client.application?.commands.set(suggestCMD);
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand())return;

    const command: CommandInteraction = interaction as CommandInteraction;

    switch (command.commandName) {
      case 'suggest':
        return suggestCommand(command);
      default:
        break;
    }
  }

  async start(): Promise<void> {
    if (!process.env.BOT_TOKEN) {
      return console.log("Bot non lancé car aucun token n'a été défini");
    }
    await this.client.login(process.env.BOT_TOKEN);
  }
}


const suggestCMD:any = [{
  name: 'suggest',
  description: 'Proposer une blague',
  options: [{
    type: 'STRING',
    name: 'type',
    description: 'Général, Développeur, Noir, +18, Beauf, Blondes',
    required: true,
    choices: [{
      name: 'Général',
      value: 'global'
    },{
      name: 'Développeur',
      value: 'dev'
    },{
      name: 'Noir',
      value: 'dark'
    },{
      name: '+18',
      value: 'limit'
    },{
      name: 'Beauf',
      value: 'beauf'
    },{
      name: 'Blondes',
      value: 'Blondes'
    }]
  },{
    type: 'STRING',
    name: 'joke',
    description: 'Contenue de la blague',
    required: true
  },{
    type: 'STRING',
    name: 'response',
    description: 'Réponse de la blague',
    required: true
  }]
}]

