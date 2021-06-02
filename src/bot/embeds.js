const { stripIndents } = require('common-tags');

const suggestsStickyMessage = jokes => ({
  embed: {
    title: 'Bienvenue à toi ! 👋',
    description: stripIndents`
        Si tu le souhaites, tu peux proposer tes blagues afin qu'elles soient ajoutées à l'API Blagues API qui regroupe actuellement **${jokes.length}** blagues françaises.
        Elles sont toutes issues de ce salon proposées par la communauté.

        > **Sur mobile:** Copiez le contenu de [ce message](https://discord.com/channels/698822532467523605/698826767221391390/698920441917603850) pour avoir le format.`,
    fields: [
      {
        name: 'Voici les différents types:',
        value: stripIndents`
          > \`Général\`: Blagues tout public, accessibles pour tous.
          > \`Développeur\`: Blagues orientées pour les développeurs & geeks.
          > \`Noir\`: Blagues qui souligne avec cruauté certains faits.
          > \`+18\`: Blagues portées sur la sexualité.
          > \`Beauf\`: Blagues vulgaires et généralement stéréotypées.
          > \`Blondes\`: Blagues ciblées sur les femmes blondes.
        `,
      },
      {
        name: 'Règles:',
        value: stripIndents`
          > - Espace avant les caractères: \`?\` et \`!\`.
          > - Ponctuation de fin de phrase si elle contient un verbe.
          > - 130 caractères maximum par partie d'une blague.
          > - Majuscule en début de phrase à moins quelle ne soit précédée de \`...\`
        `,
      },
      {
        name: 'Voici le schéma à copier-coller : (sur ordinateur)',
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
});

const suggestsBadFormat = message => ({
  embed: {
    author: {
      name: 'Votre blague est invalide !',
      icon_url: message.author.displayAvatarURL({ format: 'png' }),
    },
    description:
      'Il semblerait que votre blague ne respecte pas le format demandé.',
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
          '`Général` • `Développeur` • `Noir` • `+18` • `Beauf` • `Blondes`',
      },
    ],
    color: 0xce0000,
    footer: {
      text: 'Blagues API',
      icon_url: message.guild.iconURL({ format: 'png' }),
    },
    timestamp: new Date(),
  },
});

const suggestsBadType = message => ({
  embed: {
    author: {
      name: 'Le type de votre blague est invalide !',
      icon_url: message.author.displayAvatarURL({ format: 'png' }),
    },
    description:
      'Il semblerait que le type de votre blague ne soit pas supporté.',
    fields: [
      {
        name: 'Votre blague',
        value: `\`\`\`${message.content}\`\`\``,
      },
      {
        name: 'Types acceptés',
        value:
          '`Général` • `Développeur` • `Noir` • `+18` • `Beauf` • `Blondes`',
      },
    ],
    color: 0xce0000,
    footer: {
      text: 'Blagues API',
      icon_url: message.guild.iconURL({ format: 'png' }),
    },
    timestamp: new Date(),
  },
});

const suggestsDupplicated = (message, currentJoke, duplicatedJoke) => ({
  embed: {
    author: {
      name: 'Êtes vous sûr que cette blague n\'existe pas déjà ?',
      icon_url: message.author.displayAvatarURL({ format: 'png' }),
    },
    description:
      'Il semblerait qu\'une blague ressemble beaucoup à la votre, êtes vous sûr que ce n\'est pas la même ?',
    fields: [
      {
        name: 'Votre blague',
        value: `>>> **Blague**: ${currentJoke.joke}\n**Réponse**: ${currentJoke.answer}`,
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
});

const suggestsClosedMP = (message, user) => ({
  embed: {
    author: {
      name: 'Vos messages privés sont fermés !',
      icon_url: user.displayAvatarURL({ format: 'png' }),
    },
    description: 'Je ne peux pas vous envoyer la blague en messages privés.',
    color: 0xcd6e57,
    footer: {
      text: 'Blagues API',
      icon_url: message.guild.iconURL({ format: 'png' }),
    },
    timestamp: new Date(),
  },
});

const correctionsStickyMessage = jokes => ({
  embed: {
    title: 'Bienvenue à toi ! 👋',
    description: stripIndents`
        Si tu le souhaites, tu peux proposer des corrections aux blagues déjà existantes à l'API Blagues API qui regroupe actuellement **${jokes.length}** blagues françaises.

        > ⚠️ **Veuillez ne proposer que des corrections pour les blagues ayant la réaction** "🎉" (si elles proviennent du salon <#698826767221391390>).
    `,
    fields: [
      {
        name: 'Voici les différents types :',
        value: stripIndents`
          > \`Général\`: Blagues tout public, accessibles pour tous.
          > \`Développeur\`: Blagues orientées pour les développeurs & geeks.
          > \`Noir\`: Blagues qui souligne avec cruauté certains faits.
          > \`+18\`: Blagues portées sur la sexualité.
          > \`Beauf\`: Blagues vulgaires et généralement stéréotypées.
          > \`Blondes\`: Blagues ciblées sur les femmes blondes.
        `,
      },
      {
        name: 'Exemple :',
        value: stripIndents`
          > **Type**: Développeur
          > **Type corrigé**: Développeur
          > **Blague**: Quand est ce qu'un Window ne bugue pas.
          > **Blague corrigée**: Quand est-ce qu'un Windows ne bug pas ?
          > **Réponse**: Lorsque l'ordinateur et étint
          > **Réponse corrigée**: Lorsque l'ordinateur est éteint.
        `,
      },
      {
        name: 'Voici le schéma à copier-coller :',
        value: stripIndents`
          \`\`\`
          > **Type**:
          > **Type corrigé**:
          > **Blague**:
          > **Blague corrigée**:
          > **Réponse**:
          > **Réponse corrigée**:
          > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
          \`\`\`
        `,
      },
    ],
    color: 0x0067ad,
  },
});

const correctionsBadFormat = message => ({
  embed: {
    author: {
      name: 'Votre correction est invalide !',
      icon_url: message.author.displayAvatarURL({ format: 'png' }),
    },
    description:
      'Il semblerait que votre correction ne respecte pas le format demandé.',
    fields: [
      {
        name: 'Format demandé',
        value: stripIndents`
          \`\`\`
          > **Type**:
          > **Type corrigé**:
          > **Blague**:
          > **Blague corrigée**:
          > **Réponse**:
          > **Réponse corrigée**:
          > ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
          \`\`\`
        `,
      },
      {
        name: 'Votre correction',
        value: `\`\`\`${message.content}\`\`\``,
      },
      {
        name: 'Types acceptés',
        value:
          '`Général` • `Développeur` • `Noir` • `+18` • `Beauf` • `Blondes`',
      },
    ],
    color: 0xce0000,
    footer: {
      text: 'Blagues API',
      icon_url: message.guild.iconURL({ format: 'png' }),
    },
    timestamp: new Date(),
  },
});

module.exports = {
  suggestsStickyMessage,
  suggestsBadFormat,
  suggestsBadType,
  suggestsDupplicated,
  suggestsClosedMP,
  correctionsStickyMessage,
  correctionsBadFormat,
};
