<!-- markdownlint-disable -->
[![Blagues API](https://raw.githubusercontent.com/draftproducts/blagues-api/master/src/public/Logo.200.png)](http://www.blagues-api.fr)

# Blagues API

API de Blagues françaises collaborative et Open Source 

[![Contributors](https://img.shields.io/github/contributors/draftproducts/blagues-api.svg?style=for-the-badge)](https://github.com/draftproducts/blagues-api/graphs/contributors)
[![Stars](https://img.shields.io/github/stars/draftproducts/blagues-api.svg?style=for-the-badge)](https://github.com/draftproducts/blagues-api/stargazers) 
[![License](https://img.shields.io/github/license/DraftProducts/blagues-api?style=for-the-badge)](https://github.com/DraftProducts/blagues-api/blob/master/LICENCE)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.me/draftproducts)

## Sommaire

> Retrouvez ici les différentes catégories du README

- [Sommaire](#sommaire)
- [Utilisation](#utilisation)
- [Contribuer](#contribuer)
- [FAQ](#faq)
- [Support](#support)
- [License](#license)

---

## Utilisation

Avant toute utilisation de l'API veuillez générer votre token Bearer en vous authentifiant avec votre compte Discord sur le site [blagues-api.fr](https://www.blagues-api.fr).

Une fois le token généré voici quelques exemples vous permettant d'utiliser l'API

> Attention ! Pensez à remplacer `<token>` par votre propre token

```javascript
// Javascript
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
    joke: 'Question', 
    anwser: 'Response' 
  }
  */
})
```

```py
# Python
import requests

response = requests.get(
  'https://www.blagues-api.fr/api/random', 
  headers = { 
    'Authorization': 'Bearer <token>'
  }
)
data = response.json()
print(response)
# Expected output:
# { 
#   id: 1, 
#   joke: 'Question', 
#   anwser: 'Response' 
# }
```
---

## Contribuer

1. 🍴 **Fork** le projet !
1. 🔨 **Fais** tes modifications !
1. ✨ **Commit** tes modifications !
1. 🚀 **Push** tes commits 
1. 🔃 Crée une **pull request** depuis <a href="https://github.com/DraftProducts/blagues-api/compare/" target="_blank">`https://github.com/DraftProducts/blagues-api/compare/`</a>.

---

## FAQ

- **Pouvons nous proposer des blagues ?**
  - Oui bien sûr en rejoignant le serveur <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a> un salon y est dédié !

---

## Support

Voici quelques liens pour obtenir de l'aide

- Site web: <a href="https://www.blagues-api.fr" target="_blank">`www.blagues-api.fr`</a>
- Discord: <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a>
- Twitter: <a href="http://twitter.com/DraftMan_Dev" target="_blank">`@DraftMan_Dev`</a>

---

## Donations

Si vous souhaitez me soutenir, c'est possible grâce à PayPal

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.me/draftproducts)

---

## License

[![License](https://img.shields.io/github/license/DraftProducts/blagues-api?style=for-the-badge)](https://github.com/DraftProducts/blagues-api/blob/master/LICENCE)

Copyright 2020-2021 © <a href="https://www.draftman.fr" target="_blank">DraftMan</a>.
