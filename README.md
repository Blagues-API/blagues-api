[![Blagues API](https://raw.githubusercontent.com/DraftProducts/blagues-api/master/src/public/Logo.200.png)](http://www.blagues-api.fr)
# Blagues API

API de blagues française par authentification Auth2.0 Bearer sous licence MIT

## Sommaire

> Retrouvez ici les différentes catégories du README

- [Sommaire](#sommaire)
- [Usage](#usage)
- [Contribuer](#contribuer)
- [FAQ](#faq)
- [Support](#support)
- [License](#license)

---

## Usage

Avant toute utilisation de l'api veuillez générer votre token Bearer depuis la page **account** site [www.blagues-api.fr](https://www.blagues-api.fr) accessible depuis une authentification discord

Une fois le token généré voici quelques exemples vous permettant d'utiliser l'api

```javascript

import fetch from "node-fetch" 

fetch('https://www.blagues-api.fr/api/random', {
    headers: {
        'Authorization': 'Bearer <token>'
    }
})
.then(response => {
    console.log(response)
    /* Expected output:
    { 
      id: 1, 
      question: 'Question', 
      anwser: 'Response' 
    }
    */
})
```

## Contribuer

> Pour commencer...

### Étape 1

- **Option 1**
    - 🍴 Fork le repo!

- **Option 2**
    - 👯 Clone le repo sur ta machine locale avec `https://github.com/DraftProducts/blagues-api.git`

### Étape 2

- **Fais tes modifications !** 🔨🔨🔨

### Étape 3

- 🔃 Crée une nouvelle pull request avec <a href="https://github.com/DraftProducts/blagues-api/compare/" target="_blank">`https://github.com/DraftProducts/blagues-api/compare/`</a>.

---

## FAQ

- **Pouvons nous ajouter des blagues ?**
    - Oui bien sûr en éditant le fichier blagues.json et en le soumetant avec une pull request 
---

## Support

Voici quelques liens pour obtenir de l'aide

- Site web: <a href="https://www.blagues-api.fr" target="_blank">`www.blagues-api.fr`</a>
- Discord: <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a>
- Twitter: <a href="http://twitter.com/DraftMan_Dev" target="_blank">`@DraftMan_Dev`</a>

---

## Donations

- Si vous souhaitez me soutenir, c'est possible grâce à paypal

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/draftproducts)

---

## License

[![License](https://img.shields.io/github/license/DraftProducts/blagues-api)](https://github.com/DraftProducts/blagues-api/blob/master/LICENCE)

- **[MIT license](https://github.com/DraftProducts/blagues-api/blob/master/LICENCE)**
- Copyright 2020 © <a href="https://www.draftman.fr" target="_blank">DraftMan</a>.
