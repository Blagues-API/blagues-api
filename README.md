[![Blagues API](https://raw.githubusercontent.com/Blagues-API/api/master/src/public/logo.png)](http://www.blagues-api.fr)

# Blagues API

API de Blagues françaises collaborative et Open Source

[![Jokes](https://img.shields.io/badge/dynamic/json?color=informational&label=jokes%20&query=%24.count&suffix=%20&url=https%3A%2F%2Fwww.blagues-api.fr%2Fapi%2Fcount)](https://www.blagues-api.fr)
[![Contributeurs](https://img.shields.io/github/contributors/Blagues-API/api.svg?style=flat)](https://github.com/Blagues-API/api/graphs/contributors)
[![Stars](https://img.shields.io/github/stars/Blagues-API/api.svg?style=flat)](https://github.com/Blagues-API/api/stargazers)
[![Licence](https://img.shields.io/github/license/Blagues-API/api?style=flat)](https://github.com/Blagues-API/api/blob/master/LICENCE)

---

## Modules

Afin de simplifier l'utilisation de Blagues API, des modules ont été créés :

- [![npm](https://img.shields.io/badge/Module%20Npm-blagues--api-red?style=flat&logo=npm)](https://www.npmjs.com/package/blagues-api) (ES6,
  CommonJS, Browser)
- [![pypi](https://img.shields.io/badge/Module%20Pypi-blagues--api-blue?style=flat&logo=pypi)](https://pypi.org/project/blagues-api) (python >=
  3.8)
- [![php](https://img.shields.io/badge/Module%20Packagist-zuruuh%2Fblagues--api-orange?style=flat&logo=packagist)](https://packagist.org/packages/zuruuh/blagues-api) (PHP 7.4+)

> Dans le cas où aucun module n'a été créé vous pouvez utiliser l'api standard.

## Utilisation

Retrouvez la documentation de l'API ainsi des modules directement sur le site [Blagues-API.fr](https://www.blagues-api.fr).

## Contribuer

Le projet est open-source ce qui signifie que vous pouvez contribuer et faire évoluer le projet.<br>
Rendez-vous sur a page des [issues](https://github.com/Blagues-API/blagues-api/issues), sélectionnez une issue qui vous intéresse et faites une demande pour y être assigné.
> Les issues ayant le label `good first issue` sont les plus simples.

### Installation de Docker

Le projet fonctionne avec Docker, il vous permettra d'obtenir le même environnement qu'en production.<br>
Si vous êtes sous Windows ou Mac, il vous faudra installer [Docker Desktop](https://www.docker.com/products/docker-desktop).

⚠️ Si vous souhaitez tout de même contribuer au projet sans utiliser Docker veillez à installer et exécuter les mêmes scripts que ceux qui sont faits dans le fichier [Dockerfile.dev](https://github.com/Blagues-API/blagues-api/blob/dev/docker/Dockerfile.dev) de développement, ensuite lancez l'instance de développement avec la commande `yarn dev:legacy`.

### Installation des dépendances du projet

```bash
yarn install # npm install
```

### Génération de l'image de développement Docker

```bash
yarn dev:build # npm run dev:build
```

### Lancement de l'instance de développement

```bash
yarn dev # npm run dev
```

🎉 Votre instance est lancée, vous pouvez dès à présent vous lancer dans le développement de l'issue choisie

---

## FAQ

- **Pouvons-nous proposer des blagues ?**
  - Oui bien sûr en rejoignant le serveur
    <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a>, des commandes telles que `/suggestion` ont été créé afin de rendre la proposition de nouvelles blagues plus facile !

---

## Support

Voici quelques liens pour obtenir de l'aide :

- Site web:
  <a href="https://www.blagues-api.fr" target="_blank">`www.blagues-api.fr`</a>
- Discord:
  <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a>
- Twitter:
  <a href="http://twitter.com/DraftMan_Dev" target="_blank">`@DraftMan_Dev`</a>

---

## Licence

[![Licence](https://img.shields.io/github/license/Blagues-API/api?style=flat)](https://github.com/Blagues-API/api/blob/master/LICENCE)

Copyright 2020-2022 ©
<a href="https://www.draftman.fr" target="_blank">DraftMan</a>.
