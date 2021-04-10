const { Client } = require('discord.js')

const embeds = require('./bot/embeds')

const { findBestMatch } = require('string-similarity')

const jokes = require('../blagues.json')

const adminUsers = [
  '555068713343254533',
  '207190782673813504',
  '164738865649811457',
  '655032713941614632',
  '150249602635792385',
]
const suggestsChannel = '698826767221391390'
const correctionsChannel = '826856142793736213'
const logsChannel = '763778635857133599'

const channels = {
  [suggestsChannel]: {
    key: 'suggests',
    regex: /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> ▬+)/im,
    role: '699244416849674310',
  },
  [correctionsChannel]: {
    key: 'corrections',
    regex: /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Type corrigé\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Blague corrigée\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> \*\*Réponse corrigée\*\*: (.+)\s+)(?:> ▬+)/im,
    role: '829996106808426516',
  },
}

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

      return channel.send(embeds.suggestsStickyMessage(jokes))
    }
  }, 10000)

  setInterval(async () => {
    const channel = BlagueAPIBot.channels.cache.get(correctionsChannel)
    const messages = await channel.messages.fetch({ limit: 10 })
    const message = messages.find(m => m.author.id === BlagueAPIBot.user.id)
    if (!message || message.id !== messages.first().id) {
      if (message) await message.delete()

      return channel.send(embeds.correctionsStickyMessage(jokes))
    }
  }, 10000)
})

BlagueAPIBot.on('message', async message => {
  if (
    message.author.bot ||
    !Object.keys(channels).includes(message.channel.id)
  ) {
    return
  }

  const channel = message.guild.channels.cache.get(logsChannel)

  const { key, regex, role } = channels[message.channel.id]
  if (!regex.test(message.content)) {
    await message.delete()
    return channel.send(
      message.author.toString(),
      embeds[key + 'BadFormat'](message),
    )
  }

  if (message.channel.id === suggestsChannel) {
    const [, rawType, joke, answer] = regex.exec(message.content)

    if (!types.some(t => t.aliases.includes(rawType.toLowerCase().trim()))) {
      return channel.send(
        message.author.toString(),
        embeds.suggestsBadType(message),
      )
    }

    const { bestMatch, bestMatchIndex } = findBestMatch(
      `${joke} ${answer}`,
      jokes.map(e => `${e.joke} ${e.answer}`),
    )

    if (bestMatch.rating > 0.7) {
      const currentJoke = { joke, answer }
      const duplicatedJoke = jokes[bestMatchIndex]
      await channel.send(
        message.author.toString(),
        embeds.suggestsDupplicate(message, currentJoke, duplicatedJoke),
      )
    }

    if (!message.member.roles.cache.has(role)) {
      await message.member.roles.add(role)
    }
  }

  /**
   * TODO: Add a Emoji to the dupplicated jokes
   */

  // up
  await message.react('705115420495183979')
  // down
  await message.react('705115406976680117')
  // yes
  if (message.channel.id === suggestsChannel) {
    await message.react('705115434969595966')
  }
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

  const { regex } = channels[message.channel.id]
  if (messageReaction.emoji.id === '705115434969595966') {
    messageReaction.users.remove(user)

    if (!regex.test(message.content)) return

    const [, rawType, joke, answer] = regex.exec(message.content)

    try {
      const type = types.find(t =>
        t.aliases.includes(rawType.toLowerCase().trim()),
      )
      await user.send(
        `{\n  "id": ,\n  "type": "${
          type?.ref ?? 'Inconnu'
        }",\n  "joke": "${joke}",\n  "answer": "${answer.replace(
          /"/g,
          '\\"',
        )}"\n},`,
        { code: 'json' },
      )
    } catch (error) {
      const channel = message.guild.channels.cache.get(logsChannel)
      await channel.send(
        user.toString(),
        embeds.suggestsClosedMP(message, user),
      )
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

const types = [
  {
    ref: 'global',
    aliases: ['global', 'général', 'general', 'normale'],
  },
  {
    ref: 'dark',
    aliases: ['dark', 'noir', 'noire'],
  },
  {
    ref: 'dev',
    aliases: ['dev', 'développeur', 'developpeur'],
  },
  {
    ref: 'limit',
    aliases: ['limit', 'limite limite', 'limit limit', 'limite', '+18', '18+'],
  },
  {
    ref: 'beauf',
    aliases: ['beauf'],
  },
  {
    ref: 'blondes',
    aliases: ['blondes', 'blonds', 'blondines'],
  },
]

BlagueAPIBot.login(process.env.discord_bot_token)
