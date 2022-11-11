import { gitCommitPush } from '../lib/push';
import fs from 'fs';
import { TextChannel } from 'discord.js';
import { interactionProblem } from '../utils';
import Bot from 'bot';

export async function runGitPush(bot: Bot): Promise<void> {

  try {
    gitCommitPush({
      owner: 'blagues-api',
      repo: 'blagues-api',
      // commit files
      file: { path: 'blagues.json', content: fs.readFileSync('./blagues.json', 'utf-8') },
      baseBranch: 'dev',
      mergeBranch: 'chore/autopublish-jokes'
    });
  } catch (error) {
    console.log(error);
    const channel = bot.channels.cache.get(process.env.LOGS_CHANNEL!) as TextChannel;
    await channel.send({
      ...interactionProblem(`L'erreur suivante est survenue : \`\`\`${error}\`\`\``)
    });
  }
}
