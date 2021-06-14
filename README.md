[![Blagues API](https://raw.githubusercontent.com/Blagues-API/api/master/src/public/logo.png)](http://www.blagues-api.fr)

# Blagues API

API de Blagues françaises collaborative et Open Source

[![Contributors](https://img.shields.io/github/contributors/Blagues-API/api.svg?style=for-the-badge)](https://github.com/Blagues-API/api/graphs/contributors)
[![Stars](https://img.shields.io/github/stars/Blagues-API/api.svg?style=for-the-badge)](https://github.com/Blagues-API/api/stargazers)
[![License](https://img.shields.io/github/license/Blagues-API/api?style=for-the-badge)](https://github.com/Blagues-API/api/blob/master/LICENCE)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.me/draftproducts)

---

## Modules

Afin de simplifier l'utilisation de Blagues API, des modules ont été créés:

- Module npm [`blagues-api`](https://www.npmjs.com/package/blagues-api) (ES6,
  CommonJS, Browser)
- Module pypi [`blagues-api`](https://pypi.org/project/blagues-api) (python >=
  3.8)

> Dans le cas où aucun module n'a été créé vous pouvez utiliser l'api standard.

## Utilisation

Avant toute utilisation de l'API veuillez générer votre token Bearer en vous
authentifiant avec votre compte Discord sur le site
[blagues-api.fr](https://www.blagues-api.fr).

Une fois le token généré voici quelques exemples vous permettant d'utiliser
l'API

### Blague aléatoire

```
GET /api/random
```

À cette url, vous pouvez spécifier certains types que vous ne souhaitez pas
recevoir.

```js
GET /api/random?disallow=dark&disallow=limit
```

### Blague aléatoire d'une catégorie

```js
GET /api/type/:type:/random
// type: global, dev, dark, limit, beauf, blondes
```

### Blague à partir de son ID

Les blagues sont identifiées par un ID que vous recevez en même tant que chaque
blague.

Spécifiez cet identifiant en paramètre et vous l'obtiendez à nouveau.

```js
GET /api/id/:id:
```

## Exemples

```javascript
// NodeJS
const fetch = require('node-fetch');

fetch('https://www.blagues-api.fr/api/random', {
  headers: {
    Authorization: 'Bearer VOTRE_TOKEN_ICI'
  }
})
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    /* Expected output:
    { 
      id: 1, 
      type: 'type', 
      joke: 'Question', 
      answer: 'Response' 
    }
    */
  });
```

```py
# Python
import requests

response = requests.get(
  'https://www.blagues-api.fr/api/random',
  headers = {
    'Authorization': 'Bearer VOTRE_TOKEN_ICI'
  }
)
data = response.json()
print(response)
# Expected output:
# {
#   id: 1,
#   type: 'type',
#   joke: 'Question',
#   answer: 'Response'
# }
```

---

## Contribuer

1. 🍴 **Fork** le projet !
1. 🔨 **Fais** tes modifications !
1. ✨ **Commit** tes modifications !
1. 🚀 **Push** tes commits
1. 🔃 Crée une **pull request** depuis
   <a href="https://github.com/Blagues-API/blagues-api/compare" target="_blank">`https://github.com/Blagues-API/blagues-api/compare`</a>.

---

## FAQ

- **Pouvons nous proposer des blagues ?**
  - Oui bien sûr en rejoignant le serveur
    <a href="https://discord.gg/PPNpVaF" target="_blank">`Blagues API`</a> un
    salon y est dédié !

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

## Donations

Si vous souhaitez me soutenir, c'est possible grâce à PayPal

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://www.paypal.me/draftproducts)

---

## License

[![License](https://img.shields.io/github/license/Blagues-API/api?style=for-the-badge)](https://github.com/Blagues-API/api/blob/master/LICENCE)

Copyright 2020-2021 ©
<a href="https://www.draftman.fr" target="_blank">DraftMan</a>.
