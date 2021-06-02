const { stripIndents } = require('common-tags');

const Bot = require('../src/bot/blagues-api');
const { channels } = require('../src/bot/constants');
const { suggestsBadType, suggestsDupplicated } = require('../src/bot/embeds');
const { message, textChannel } = require('./mocks/discord');

const jokes = require('../blagues.json');

describe('Jokes validation', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(message.guild.channels.cache, 'get')
      .mockImplementationOnce(() => textChannel);
  });

  test('Joke should be refused because format is wrong', async () => {
    expect.assertions(1);

    message.content = stripIndents`
      Un développeur ne descend pas du métro.
      Il libère la RAM...
    `;

    await Bot.onMessage(message);

    expect(message.delete).toHaveBeenCalled();
  });

  test('Joke should be refused because type if wrong', async () => {
    expect.assertions(1);

    message.content = stripIndents`
      > **Type**: Aucun
      > **Blague**: Un développeur ne descend pas du métro.
      > **Réponse**: Il libère la RAM...
      > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    `;

    await Bot.onMessage(message);

    expect(textChannel.send).toHaveBeenCalledWith(message.author.toString(), suggestsBadType(message));
  });

  test('Joke should be refused because joke exist already', async () => {
    expect.assertions(1);

    message.content = stripIndents`
      > **Type**: Développeur
      > **Blague**: Un développeur ne descend pas du métro.
      > **Réponse**: Il libère la RAM...
      > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    `;

    const [,, joke, answer] = channels[message.channel.id].regex.exec(message.content);
    await Bot.onMessage(message);
    const embed = suggestsDupplicated(message, { joke, answer }, jokes[2]);

    expect(textChannel.send).toHaveBeenCalledWith(message.author.toString(), embed);
  });

  test('Joke should be refused because joke exist already', async () => {
    expect.assertions(2);

    message.content = stripIndents`
      > **Type**: Développeur
      > **Blague**: Une blague qui ne ressemble à aucune autre
      > **Réponse**: Afin qu'elle soit valide !
      > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    `;

    await Bot.onMessage(message);

    expect(textChannel.send).not.toHaveBeenCalled();
    expect(message.react).toHaveBeenCalledTimes(3);
  });
});
