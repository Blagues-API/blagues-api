const { Client } = require('discord.js');

const StickyMessages = require('./sticky-messages');

const {
  suggestsChannel,
  logsChannel,
  adminUsers,
  channels,
  types
} = require('./constants');

const embeds = require('./embeds');

const jokes = require('../../blagues.json');

const { findBestMatch } = require('string-similarity');

module.exports = class BlaguesAPI extends Client {
  constructor() {
    super({
      partials: ['MESSAGE', 'REACTION']
    });
    this.stickyMessages = new StickyMessages(this);

    this.once('ready', this.onReady);
  }

  onReady() {
    console.log(`${this.user.tag} connecté !`);

    this.initEvents();
    this.setStatus();

    this.stickyMessages.run();
  }

  initEvents() {
    this.on('message', BlaguesAPI.onMessage);
    this.on('messageReactionAdd', BlaguesAPI.onMessageReactionAdd);
  }

  static async onMessage(message) {
    if (
      message.author.bot ||
      !Object.keys(channels).includes(message.channel.id)
    ) {
      return;
    }

    const channel = message.guild.channels.cache.get(logsChannel);

    const { key, regex, role } = channels[message.channel.id];
    if (!regex.test(message.content)) {
      await message.delete();
      return channel.send(
        message.author.toString(),
        embeds[key + 'BadFormat'](message)
      );
    }

    if (message.channel.id === suggestsChannel) {
      const [, rawType, joke, answer] = regex.exec(message.content);

      if (
        !types.some((t) => t.aliases.includes(rawType.toLowerCase().trim()))
      ) {
        return channel.send(
          message.author.toString(),
          embeds.suggestsBadType(message)
        );
      }

      const { bestMatch, bestMatchIndex } = findBestMatch(
        `${joke} ${answer}`,
        jokes.map((e) => `${e.joke} ${e.answer}`)
      );

      if (bestMatch.rating > 0.7) {
        await channel.send(
          message.author.toString(),
          embeds.suggestsDupplicated(
            message,
            { joke, answer },
            jokes[bestMatchIndex]
          )
        );
      }

      if (!message.member.roles.cache.has(role)) {
        await message.member.roles.add(role);
      }
    }

    /**
     * TODO: Add a Emoji to the dupplicated jokes
     */

    // up
    await message.react('705115420495183979');
    // down
    await message.react('705115406976680117');
    // yes
    if (message.channel.id === suggestsChannel) {
      await message.react('705115434969595966');
    }
  }

  static async onMessageReactionAdd(messageReaction, user) {
    let message = messageReaction.message;
    if (message.partial) message = await message.fetch();

    if (
      message.channel.id !== suggestsChannel ||
      user.bot ||
      !adminUsers.includes(user.id)
    ) {
      return;
    }

    const { regex } = channels[message.channel.id];
    if (messageReaction.emoji.id === '705115434969595966') {
      messageReaction.users.remove(user);

      if (!regex.test(message.content)) return;

      const [, rawType, joke, answer] = regex.exec(message.content);

      try {
        const type = types.find((t) =>
          t.aliases.includes(rawType.toLowerCase().trim())
        );
        await user.send(
          `{\n  "id": ,\n  "type": "${
            type?.ref ?? 'Inconnu'
          }",\n  "joke": "${joke}",\n  "answer": "${answer.replace(
            /"/g,
            '\\"'
          )}"\n},`,
          { code: 'json' }
        );
      } catch (error) {
        const channel = message.guild.channels.cache.get(logsChannel);
        await channel.send(
          user.toString(),
          embeds.suggestsClosedMP(message, user)
        );
      }

      message.react('🎉');
    }

    if (messageReaction.emoji.name === '❌') {
      const accept = message.reactions.cache.get('705115434969595966');
      if (accept) {
        accept.remove();
      }
    }
  }

  setStatus() {
    this.user.setActivity(`les ${jokes.length} blagues`, {
      type: 'WATCHING'
    });
    setInterval(() => {
      this.user.setActivity(`les ${jokes.length} blagues`, {
        type: 'WATCHING'
      });
    }, 24 * 60 * 60 * 1000);
  }
};
