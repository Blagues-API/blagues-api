const { suggestsChannel, correctionsChannel } = require('./constants');
const { suggestsStickyMessage, correctionsStickyMessage } = require('./embeds');

const jokes = require('../../blagues.json');

module.exports = class StickyMessages {
  constructor(client) {
    this.client = client;
  }

  run() {
    this.stickySuggests();
    this.stickyCorrections();
  }

  stickySuggests() {
    setInterval(async () => {
      const channel = this.client.channels.cache.get(suggestsChannel);
      const messages = await channel.messages.fetch({ limit: 10 });
      const message = messages.find(m => m.author.id === this.client.user.id);
      if (!message || message.id !== messages.first().id) {
        if (message) await message.delete();

        return channel.send(suggestsStickyMessage(jokes));
      }
    }, 10000);
  }

  stickyCorrections() {
    setInterval(async () => {
      const channel = this.client.channels.cache.get(correctionsChannel);
      const messages = await channel.messages.fetch({ limit: 10 });
      const message = messages.find(m => m.author.id === this.client.user.id);
      if (!message || message.id !== messages.first().id) {
        if (message) await message.delete();

        return channel.send(correctionsStickyMessage(jokes));
      }
    }, 10000);
  }
};
