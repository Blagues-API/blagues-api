const { Client } = require('discord.js');

const jokes = require('../blagues.json');

const adminUsers = ['555068713343254533', '207190782673813504'];
const suggestsChannel = '698826767221391390';

const BlagueAPIBot = new Client();

BlagueAPIBot.on('ready', () => {
    console.log(`${BlagueAPIBot.user.tag} connecté !`);
    BlagueAPIBot.user.setActivity(`les ${jokes.length} blagues`, { type: 'WATCHING' });
});

BlagueAPIBot.on('messageReactionAdd', (messageReaction, user) => {

    if(messageReaction.message.channel !== suggestsChannel) return;

    if(messageReaction.emoji.id !== '673309915988623393' || !adminUsers.includes(user.id)) {
        return messageReaction.users.remove(user);
    }

    // définir la regex

    // utiliser la regex pour verifier si c'est bien une blague: String.test(Regex)

    // recupérer les 3 groups Type, Blague, Réponse

    // Convertir le type

    const type = '';
    const joke = '';
    const answer = '';

    user.send(`
        Voici le json de la blague: 
        \`\`\`
        {
            "id": "ID",
            "type": "${type}",
            "joke": "${joke}",
            "answer": "${answer}"
        }
        \`\`\`
    `, {
        code: 'json',
    });
});

return BlagueAPIBot;