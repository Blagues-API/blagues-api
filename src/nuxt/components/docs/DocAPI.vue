<template>
  <div>
    <div id="api" class="block">
      <div class="flex-space top">
        <h2 class="title">API publique</h2>
        <Selector />
      </div>
      <p>
        L'API Rest est le meilleur moyen d'utiliser Blagues-API sans
        dépendances, en requièrera nénanmoins plus de connaissances et de
        prérequis.
      </p>
    </div>
    <div id="use" class="block">
      <a href="#use" class="title-container">
        <h3 class="title">Utilisation</h3>
      </a>
      <p class="text">
        Différentes routes vous sont rendues disponibles afin d'adapter l'api a
        votre projet. Les différents mots clés vous permettront de récupérer une
        blague aléatoirement dans un thème ou type de blague spécifique.
      </p>
      <div class="example">
        <h5 class="language">BLAGUE ALÉATOIRE</h5>
        <pre><code class="language-javascript">GET /api/random</code></pre>
      </div>
      <div class="example">
        <h5 class="language">BLAGUE ALÉATOIRE CATÉGORISÉ</h5>
        <pre><code class="language-javascript">GET /api/type/:type:/random // type: global, dev, dark, limit, beauf, blondes</code></pre>
      </div>
      <div class="example">
        <h5 class="language">BLAGUE PAR ID</h5>
        <pre><code class="language-javascript">GET /api/id/:id:</code></pre>
      </div>
    </div>
    <div id="advanced-use" class="block">
      <a href="#advanced-use" class="title-container">
        <h3 class="title">Utilisation avancé</h3>
      </a>
      <p class="text">
        Parfois certains types d'humour dérangent certaines personnes, hors
        blagues-api est une api publique qui s'est donné comme mission de
        convenir aux tous types d'humour. C'est pour cela que nous vous offrons
        la possibilité de filtrer les blagues et donc d'en retirer celles qui
        font partie d'une catégorie qui ne vous convient pas.
      </p>
      <div class="example">
        <h5 class="language">UTILISATION D'UN SEUL FILTRE</h5>
        <pre><code class="language-javascript">GET /api/random?disallow=dark</code></pre>
      </div>
      <div class="example">
        <h5 class="language">UTILISATION DE PLUSIEURS FILTRES</h5>
        <pre><code class="language-javascript">GET /api/random?disallow=dark&disallow=limit&disallow=dev</code></pre>
      </div>
    </div>
    <div id="auth" class="block">
      <a href="#auth" class="title-container">
        <h3 class="title">Authentification</h3>
      </a>
      <p class="text">
        L'api de blagues utilise un token d'authentification Bearer pour les
        requêtes. Vous pouvez le gérer depuis votre profil.<br />
        Les requêtes doivent toutes être effectuées via
        <a href="http://en.wikipedia.org/wiki/HTTP_Secure">HTTPS</a>. Tous les
        appels effectuées sans authentification ou en HTTP échoueront.<br />
        Si vous avez des difficultées à obtenir un certificat HTTPS, voici
        <a href="https://certbot.eff.org/">Certbot</a>, un outil qui permet d'en
        obtenir un gratuitement !
      </p>
      <div class="example">
        <pre><code class="language-bash">
          curl https://www.blagues-api.fr/api/random \
            -H "Authorization: Bearer <mark>VOTRE_TOKEN_ICI</mark>" \</code></pre>
      </div>
    </div>
    <div id="example" class="block">
      <a href="#example" class="title-container">
        <h3 class="title">Exemple</h3>
      </a>
      <p class="text">
        Voici un exemple sous forme de cas d'utilisation de l'api dans le cas où
        l'on souhaite récupérer une blague aléatoirement dans le répertoire
        toute catégorie confondue
      </p>
      <div class="example">
        <span class="language">JAVASCRIPT</span>
        <pre><code class="language-javascript">
        fetch('https://www.blagues-api.fr/api/random', {
          headers: {
            'Authorization': `Bearer <mark>VOTRE_TOKEN_ICI</mark>`
          }
        })
        .then(response => response.json())
        .then(data => {
          console.log(data)
          /* Expected output:
          {
            "id": 1,
            "type": "dev",
            "joke": "Un développeur ne descend pas du métro.",
            "answer": "Il libère la RAM..."
          }
          */
        })</code></pre>
      </div>
    </div>
  </div>
</template>

<script>
import Selector from '@/components/home/Selector.vue'

export default {
  components: {
    Selector,
  },
}
</script>
