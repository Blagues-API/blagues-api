const { suggestsChannel } = require('../../src/bot/constants');

const guild = {
  channels: {
    cache: {
      get: jest.fn(),
    },
  },
  iconURL: jest.fn(),
};

const user = {
  bot: false,
  displayAvatarURL: jest.fn(),
  toString: jest.fn(),
};

const textChannel = {
  send: jest.fn(),
};

const message = {
  guild,
  channel: {
    ...textChannel,
    id: suggestsChannel,
  },
  member: {
    user,
    roles: {
      add: jest.fn(),
      cache: {
        has: jest.fn(),
      },
    },
  },
  author: user,
  content: '',
  delete: jest.fn(),
  react: jest.fn(),
};

module.exports = {
  message,
  textChannel,
  guild,
  user,
};
