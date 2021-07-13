<template>
  <section class="informations">
    <div class="head">
      <h2 class="title">Qu’est ce que Blagues API ?</h2>
      <p>
        <strong>Blagues API</strong> est une API de blagues, rassemblant les
        meilleures blagues avec un total de
        <strong>{{ count }} blagues</strong> françaises.
      </p>
      <p>Des blagues proposées par la communauté et catégorisées.</p>
      <p>
        L’API est accessible <strong>gratuitement</strong> et rassemble sur le
        <a href="https://discord.gg/PPNpVaF" title="Discord de Blagues API"
          >discord</a
        >
        une communauté francophone.
      </p>
    </div>
    <div class="usecases" id="use">
      <a href="#use" class="title-container">
        <h3 class="title">Utilisation</h3>
      </a>
      <p>
        Différentes routes vous sont rendues disponibles afin d'adapter l'api a
        votre projet. Les différents mots clés vous permettront de récupérer une
        blague aléatoirement dans un thème ou type de blague spécifique.
      </p>
      <div class="example">
        <h4 class="language">BLAGUE ALÉATOIRE</h4>
        <pre><code class="language-javascript">GET /api/random</code></pre>
      </div>
      <div class="example">
        <h4 class="language">BLAGUE ALÉATOIRE CATÉGORISÉ</h4>
        <pre><code class="language-javascript">GET /api/type/:type:/random // type: global, dev, dark, limit, beauf, blondes</code></pre>
      </div>
      <div class="example">
        <h4 class="language">BLAGUE PAR ID</h4>
        <pre><code class="language-javascript">GET/api/id/:id:</code></pre>
      </div>
    </div>
    <div class="usecases" id="advanced-use">
      <a href="#advanced-use" class="title-container">
        <h3 class="title">Utilisation avancé</h3>
      </a>
      <p>
        Parfois certains types d'humour dérangent certaines personnes, hors
        blagues-api est une api publique qui s'est donné comme mission de
        convenir aux tous types d'humour. C'est pour cela que nous vous offrons
        la possibilité de filtrer les blagues et donc d'en retirer celles qui
        font partie d'une catégorie qui ne vous convient pas.
      </p>
      <div class="example">
        <h4 class="language">UTILISATION D'UN SEUL FILTRE</h4>
        <pre><code class="language-javascript">GET /api/random?disallow=dark</code></pre>
      </div>
      <div class="example">
        <h4 class="language">UTILISATION DE PLUSIEURS FILTRES</h4>
        <pre><code class="language-javascript">GET /api/random?disallow=dark&disallow=limit&disallow=dev</code></pre>
      </div>
    </div>
    <div class="usecases" id="auth">
      <a href="#auth" class="title-container">
        <h3 class="title">Authentification</h3>
      </a>
      <p>
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
        <pre><code class="language-bash">curl https://www.blagues-api.fr/api/random \
-H "Authorization: Bearer [TOKEN]" \</code></pre>
      </div>
    </div>
    <div class="usecases" id="example">
      <a href="#example" class="title-container">
        <h3 class="title">Exemple</h3>
      </a>
      <p>
        Voici un exemple sous forme de cas d'utilisation de l'api dans le cas où
        l'on souhaite récupérer une blague aléatoirement dans le répertoire
        toute catégorie confondue
      </p>
      <div class="example">
        <span class="language">JAVASCRIPT</span>
        <pre><code class="language-javascript">fetch('https://www.blagues-api.fr/api/random', {
    headers: {
        'Authorization': `Bearer [TOKEN]`
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
    <div class="usecases" id="thanks">
      <a href="#thanks" class="title-container">
        <h3 class="title">Remerciements</h3>
      </a>
      <p>
        Un grand merci à toute la communauté qui a contribué au projet que ça
        soit sur le discord ou sur le github en apportant leurs ajouts et
        modifications au code de l'api, mais également à tous ceux qui ont
        proposé leurs blagues afin d'agrandir le répertoire de l'api. Le nombre
        de blagues françaises continuent de grandir de jours en jours. Merci à
        vous !
      </p>
    </div>
  </section>
</template>

<script>
import jokes from '../../../../../blagues.json';

export default {
  setup() {
    const count = jokes.length;
    return { count };
  }
};
</script>

<style lang="scss">
.informations {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  @media (max-width: 420px) {
    padding: 40px 20px;
  }
  .head {
    margin-bottom: 20px;
    .title {
      font-weight: bold;
      font-size: 26px;
      color: #0067ad;
      margin-bottom: 20px;
      text-align: center;
      @media (max-width: 420px) {
        font-size: 20px;
      }
    }
    p {
      font-size: 14px;
      text-align: center;
      color: #393939;
      margin-bottom: 3px;
      font-weight: 600;
    }
  }
  .usecases {
    display: flex;
    flex-direction: column;
    background: var(--white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    max-width: 900px;
    width: 100%;
    padding: 16px;
    margin: 20px auto;
    .title-container {
      position: relative;
      margin: 0 auto;
      text-decoration: none !important;
      .title {
        font-size: 22px;
        color: #5f5f5f;
        text-align: center;
        margin: 10px 0 16px;
        font-weight: bold;
        cursor: pointer;
        &::after {
          content: '#';
          position: absolute;
          left: -14px;
          top: 12px;
          color: #c5c5c5;
          font-weight: 400;
          font-size: 18px;
          opacity: 0;
          transition: 0.1s opacity ease-in-out;
        }
        &:hover::after {
          opacity: 1;
        }
      }
    }
    p {
      font-size: 14px;
      margin: 8px 0 16px;
      color: #404040;
      font-weight: 600;
      line-height: 20px;
    }
    .example {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
      &:last-child {
        margin-bottom: 8px;
      }
      .language {
        font-size: 12px;
        color: #8b8b8b;
        margin: 0 0 6px 2px;
        font-weight: bold;
      }
    }
  }
}
</style>
