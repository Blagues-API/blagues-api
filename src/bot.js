const { Client } = require('discord.js')
const { stripIndents } = require('common-tags')

const { findBestMatch } = require('string-similarity')

const jokes = require('../blagues.json')
const regex = /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> ▬+)/im

const adminUsers = [
  '555068713343254533',
  '207190782673813504',
  '164738865649811457',
]
const jokeRole = '699244416849674310'

const suggestsChannel = '698826767221391390'
const logsChannel = '763778635857133599'

const BlagueAPIBot = new Client({
  partials: ['MESSAGE', 'REACTION'],
})

BlagueAPIBot.on('ready', () => {
  console.log(`${BlagueAPIBot.user.tag} connecté !`)

  BlagueAPIBot.user.setActivity(`les ${jokes.length} blagues`, {
    type: 'WATCHING',
  })
  setInterval(() => {
    BlagueAPIBot.user.setActivity(`les ${jokes.length} blagues`, {
      type: 'WATCHING',
    })
  }, 24 * 60 * 60 * 1000)

  setInterval(async () => {
    const channel = BlagueAPIBot.channels.cache.get(suggestsChannel)
    const messages = await channel.messages.fetch({ limit: 10 })
    const message = messages.find(m => m.author.id === BlagueAPIBot.user.id)
    if (!message || message.id !== messages.first().id) {
      if (message) await message.delete()

      return channel.send({
        embed: {
          title: 'Bienvenue à toi ! 👋',
          description: stripIndents`
            Si tu le souhaites, tu peux proposer tes blagues afin qu'elles soient ajoutés à l'api Blagues API qui est une api qui regroupe actuellement **${jokes.length}** blagues françaises.
            Elles sont toutes issues de ce salon proposé par la communauté.

            >>> Tous les types de blagues sont acceptés à condition qu'elles soient correctement catégorisées et qu'elles respectent le format demandé.`,
          fields: [
            {
              name: 'Voici les différents types:',
              value:
                '> `Général`, `Développeur`, `Noir`, `Limite Limite`, `Beauf`, `Blondes`',
            },
            {
              name: 'Exemple:',
              value: stripIndents`
                > **Type**: Développeur
                > **Blague**: Quand est ce qu'un Windows ne bug pas ?
                > **Réponse**: Lorsque l'ordinateur est éteint.
              `,
            },
            {
              name: 'Voici le schéma a copier coller !',
              value: stripIndents`
                \`\`\`
                > **Type**:
                > **Blague**:
                > **Réponse**:
                > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
                \`\`\`
              `,
            },
          ],
          color: 0x0067ad,
        },
      })
    }
  }, 10000)
})

BlagueAPIBot.on('message', async message => {
  if (message.channel.id !== suggestsChannel || message.author.bot) return

  const channel = message.guild.channels.cache.get(logsChannel)

  if (!regex.test(message.content)) {
    message.delete()
    return channel.send(message.author.toString(), {
      embed: {
        author: {
          name: 'Votre blague est invalide',
          icon_url: message.author.displayAvatarURL({ format: 'png' }),
        },
        description:
          'Il semblerait que votre blague ne respecte pas le format demandé',
        fields: [
          {
            name: 'Format demandé',
            value:
              '```json\n> **Type**: \n> **Blague**: \n> **Réponse**: \n> ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬```',
          },
          {
            name: 'Votre blague',
            value: `\`\`\`${message.content}\`\`\``,
          },
          {
            name: 'Types acceptés',
            value:
              '`Général` • `Développeur` • `Noir` • `Limite limite` • `Beauf` • `Blondes`',
          },
        ],
        color: 0xce0000,
        footer: {
          text: 'Blagues API',
          icon_url: message.guild.iconURL({ format: 'png' }),
        },
        timestamp: new Date(),
      },
    })
  }

  const [, , joke, answer] = regex.exec(message.content)

  const { bestMatch, bestMatchIndex } = findBestMatch(
    joke,
    jokes.map(e => e.joke),
  )

  if (bestMatch.rating > 0.7) {
    const duplicatedJoke = jokes[bestMatchIndex]
    await channel.send(message.author.toString(), {
      embed: {
        author: {
          name: "Êtes vous sûr que cette blague n'existe pas déjà ?",
          icon_url: message.author.displayAvatarURL({ format: 'png' }),
        },
        description:
          "Il semblerait qu'une blague ressemble beaucoup à la votre, êtes vous sûr que ce n'est pas la même ?",
        fields: [
          {
            name: 'Votre blague',
            value: `>>> **Blague**: ${joke}\n**Réponse**: ${answer}`,
          },
          {
            name: 'Blague ressemblante',
            value: `>>> **Blague**: ${duplicatedJoke.joke}\n**Réponse**: ${duplicatedJoke.answer}`,
          },
        ],
        color: 0xcd6e57,
        footer: {
          text: 'Blagues API',
          icon_url: message.guild.iconURL({ format: 'png' }),
        },
        timestamp: new Date(),
      },
    })
  }

  if (!message.member.roles.cache.has(jokeRole)) {
    message.member.roles.add(jokeRole)
  }

  // up
  await message.react('705115420495183979')
  // down
  await message.react('705115406976680117')
  // yes
  await message.react('705115434969595966')
})

BlagueAPIBot.on('messageReactionAdd', async (messageReaction, user) => {
  let message = messageReaction.message
  if (message.partial) message = await message.fetch()

  if (
    message.channel.id !== suggestsChannel ||
    user.bot ||
    !adminUsers.includes(user.id)
  ) {
    return
  }

  if (messageReaction.emoji.id === '705115434969595966') {
    messageReaction.users.remove(user)

    if (!regex.test(message.content)) return

    const [, rawType, joke, answer] = regex.exec(message.content)

    try {
      await user.send(
        stripIndents`
          {
              "id": ,
              "type": "${types[rawType.toLowerCase()]}",
              "joke": "${joke}",
              "answer": "${answer.replace(/"/g, '\\"')}"
          },`,
        { code: 'json' },
      )
    } catch (error) {
      const channel = message.guild.channels.cache.get(logsChannel)
      await channel.send(user.toString(), {
        embed: {
          author: {
            name: 'Vos messages privés sont fermés !',
            icon_url: user.displayAvatarURL({ format: 'png' }),
          },
          description:
            'Je ne peux pas vous envoyer la blague en messages privés.',
          color: 0xcd6e57,
          footer: {
            text: 'Blagues API',
            icon_url: message.guild.iconURL({ format: 'png' }),
          },
          timestamp: new Date(),
        },
      })
    }

    message.react('🎉')
  }

  if (messageReaction.emoji.name === '❌') {
    const accept = message.reactions.cache.get('705115434969595966')
    if (accept) {
      accept.remove()
    }
  }
})

const types = {
  général: 'global',
  noir: 'dark',
  dark: 'dark',
  développeur: 'dev',
  'limite limite': 'limit',
  limite: 'limit',
  beauf: 'beauf',
  blondes: 'blondes',
}

BlagueAPIBot.login(process.env.discord_bot_token)
