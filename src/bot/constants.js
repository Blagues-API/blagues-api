const adminUsers = [
  '555068713343254533',
  '207190782673813504',
  '164738865649811457',
  '655032713941614632',
  '150249602635792385',
];
const suggestsChannel = '698826767221391390';
const correctionsChannel = '826856142793736213';
const logsChannel = '763778635857133599';

const channels = {
  [suggestsChannel]: {
    key: 'suggests',
    regex:
      /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> ▬+)/im,
    role: '699244416849674310',
  },
  [correctionsChannel]: {
    key: 'corrections',
    regex:
      /(?:> \*\*Type\*\*: (.+)\s+)(?:> \*\*Type corrigé\*\*: (.+)\s+)(?:> \*\*Blague\*\*: (.+)\s+)(?:> \*\*Blague corrigée\*\*: (.+)\s+)(?:> \*\*Réponse\*\*: (.+)\s+)(?:> \*\*Réponse corrigée\*\*: (.+)\s+)(?:> ▬+)/im,
    role: '829996106808426516',
  },
};

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
];

module.exports = {
  adminUsers,
  suggestsChannel,
  correctionsChannel,
  logsChannel,
  channels,
  types,
};
