const { Client } = require('discord.js');

const jokes = require('../blagues.json');
const regex = /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> ▬+)/mi;

const adminUsers = ['555068713343254533', '207190782673813504', '164738865649811457'];
const jokeRole = '699244416849674310';

const suggestsChannel = '698826767221391390';
const generalChannel = '698822532467523608';

const BlagueAPIBot = new Client({
    partials: ['MESSAGE', 'REACTION'],
});

BlagueAPIBot.on('ready', () => {
    console.log(`${BlagueAPIBot.user.tag} connecté !`);
    BlagueAPIBot.user.setActivity(`les ${jokes.length} blagues`, { type: 'WATCHING' });
});

BlagueAPIBot.on('message', async message => {
    if(message.channel.id !== suggestsChannel) return;

    const channel = message.guild.channels.cache.get(generalChannel);

    if(!regex.test(message.content)) {
        message.delete();
        return channel.send('', {
            embed: {
                author: {
                    name: message.member.displayName,
                    icon_url: message.author.displayAvatarURL({ format: 'png' }),
                },
                title: 'Votre blague est invalide',
                description: 'Il semblerait que votre blague ne respecte pas le format demandé',
                fields: [{
                    name: 'Format demandé',
                    value: '```json\n> **Type**: \n> **Blague**: \n> **Réponse**: \n> ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬```',
                }, {
                    name: 'Votre blague',
                    value: `\`\`\`${message.content}\`\`\``,
                }, {
                    name: 'Types acceptés',
                    value: '`Général` • `Développeur` • `Noir` • `Limite limite` • `Beauf` • `Blondes`',
                }],
                color: 0xce0000,
                footer: {
                    text: 'Blagues API',
                    icon: message.guild.iconURL({ format: 'png' }),
                },
                timestamp: new Date(),
            },
        });
    }

    if(!message.member.roles.cache.has(jokeRole)) {
        message.member.roles.add(jokeRole);
    }

    // up
    await message.react('705115420495183979');
    // down
    await message.react('705115406976680117');
    // yes
    await message.react('705115434969595966');
});

BlagueAPIBot.on('messageReactionAdd', async (messageReaction, user) => {

    let message = messageReaction.message;
    if (message.partial) message = await message.fetch();

    if(message.channel.id !== suggestsChannel || messageReaction.emoji.id !== '705115434969595966' || user.bot || !adminUsers.includes(user.id)) return;

    messageReaction.users.remove(user);

    if(!regex.test(message.content)) return;

    const [, rawType, joke, answer] = regex.exec(message.content);

    await user.send(`{\n    "id": ,\n    "type": "${types[rawType]}",\n    "joke": "${joke}",\n    "answer": "${answer.replace(/"/, '\\"')}"\n},`, {
        code: 'json',
    });

    message.react('🎉');
});

const types = {
    'Général': 'global',
    'Noir': 'dark',
    'Développeur': 'dev',
    'Limite limite': 'limit',
    'Beauf': 'beauf',
    'Blondes': 'blondes',
};

BlagueAPIBot.login(process.env.discord_bot_token);
