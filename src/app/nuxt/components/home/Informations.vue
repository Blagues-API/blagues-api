<template>
  <section class="informations">
    <div class="content">
      <div class="block">
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
      <template v-if="status === 0">
        <div class="block" id="use">
          <a href="#use" class="title-container">
            <h3 class="title">Utilisation</h3>
          </a>
          <p class="text">
            Différentes routes vous sont rendues disponibles afin d'adapter
            l'api a votre projet. Les différents mots clés vous permettront de
            récupérer une blague aléatoirement dans un thème ou type de blague
            spécifique.
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
            <pre><code class="language-javascript">GET/api/id/:id:</code></pre>
          </div>
        </div>
        <div class="block" id="advanced-use">
          <a href="#advanced-use" class="title-container">
            <h3 class="title">Utilisation avancé</h3>
          </a>
          <p class="text">
            Parfois certains types d'humour dérangent certaines personnes, hors
            blagues-api est une api publique qui s'est donné comme mission de
            convenir aux tous types d'humour. C'est pour cela que nous vous
            offrons la possibilité de filtrer les blagues et donc d'en retirer
            celles qui font partie d'une catégorie qui ne vous convient pas.
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
        <div class="block" id="auth">
          <a href="#auth" class="title-container">
            <h3 class="title">Authentification</h3>
          </a>
          <p class="text">
            L'api de blagues utilise un token d'authentification Bearer pour les
            requêtes. Vous pouvez le gérer depuis votre profil.<br />
            Les requêtes doivent toutes être effectuées via
            <a href="http://en.wikipedia.org/wiki/HTTP_Secure">HTTPS</a>. Tous
            les appels effectuées sans authentification ou en HTTP
            échoueront.<br />
            Si vous avez des difficultées à obtenir un certificat HTTPS, voici
            <a href="https://certbot.eff.org/">Certbot</a>, un outil qui permet
            d'en obtenir un gratuitement !
          </p>
          <div class="example">
            <pre><code class="language-bash">curl https://www.blagues-api.fr/api/random \
-H "Authorization: Bearer [TOKEN]" \</code></pre>
          </div>
        </div>
        <div class="block" id="example">
          <a href="#example" class="title-container">
            <h3 class="title">Exemple</h3>
          </a>
          <p class="text">
            Voici un exemple sous forme de cas d'utilisation de l'api dans le
            cas où l'on souhaite récupérer une blague aléatoirement dans le
            répertoire toute catégorie confondue
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
      </template>
      <template v-if="status === 1">
        <div class="block" id="npm">
          <a href="#npm" class="title-container">
            <h2 class="title">Module npm</h2>
          </a>
          <p>
            Les différentes catégories vous permettront de récupérer une blague
            aléatoirement dans un thème ou type de blague spécifique.
          </p>
        </div>
        <div class="block" id="install">
          <a href="#install" class="title-container">
            <h3 class="title">Installation</h3>
          </a>
          <pre>
            <code class="language-bash">
              yarn add blagues-api
            </code>
          </pre>
        </div>
        <div class="block" id="setup">
          <a href="#setup" class="title-container">
            <h3 class="title">Mise en place</h3>
          </a>
          <pre>
            <code class="language-javascript">
              import BlaguesAPI from 'blagues-api';
            </code>
          </pre>
          <pre>
            <code class="language-javascript">
              const blagues = new BlaguesAPI('<mark>VOTRE_TOKEN_ICI</mark>');
            </code>
          </pre>
        </div>
        <div class="block" id="use">
          <a href="#use" class="title-container">
            <h3 class="title">Utilisation</h3>
          </a>
          <p class="text">
            Différentes méthodes vous sont rendues disponibles afin d'intéragir
            plus facilement avec l'API depuis votre projet.
          </p>
          <div class="block" id="random-joke">
            <a href="#random-joke" class="title-container">
              <h4 class="title">Blague aléatoire</h4>
            </a>
            <pre>
              <code class="language-javascript">
                const blague = await blagues.random();
              </code>
            </pre>
            <p class="text">
              A cette méthode, vous pouvez spécifier certains types que vous ne
              souhaitez pas recevoir.
            </p>
            <pre>
              <code class="language-javascript">
                const blague = await blagues.random({
                  disallow: [
                    blagues.categories.DARK,
                    blagues.categories.LIMIT
                  ]
                });
              </code>
            </pre>
          </div>
          <div class="block" id="random-categorized-joke">
            <a href="#random-categorized-joke" class="title-container">
              <h4 class="title">Blague aléatoire d'une catégorie</h4>
            </a>
            <pre>
              <code class="language-javascript">
                const blague = await blagues.randomCategorized(
                  blagues.categories.DARK
                );
              </code>
            </pre>
          </div>
          <div class="block" id="joke-by-id">
            <a href="#joke-by-id" class="title-container">
              <h4 class="title">Blague à partir de son ID</h4>
            </a>
            <p class="text">
              Les blagues sont identifiées par un ID que vous recevez en même
              tant que chaque blague. Spécifiez cet identifiant en paramètre et
              vous l'obtiendez à nouveau.
            </p>
            <pre>
              <code class="language-javascript">
                const blague = await blagues.fromId(50);
              </code>
            </pre>
          </div>
        </div>
      </template>
      <div class="block" id="thanks">
        <a href="#thanks" class="title-container">
          <h3 class="title">Remerciements</h3>
        </a>
        <p>
          Un grand merci à toute la communauté qui a contribué au projet que ça
          soit sur le discord ou sur le github en apportant leurs ajouts et
          modifications au code de l'api, mais également à tous ceux qui ont
          proposé leurs blagues afin d'agrandir le répertoire de l'api. Le
          nombre de blagues françaises continuent de grandir de jours en jours.
          Merci à vous !
        </p>
      </div>
    </div>
  </section>
</template>

<script>
import jokes from '../../../../../blagues.json';

import prismjs from 'prismjs';

import { ref, onMounted } from '@nuxtjs/composition-api';

export default {
  setup() {
    const count = jokes.length;
    const status = ref(0);

    const setStatus = async (num) => {
      status.value = num;
      await new Promise((resolve) => setTimeout(resolve(), 1000));
      prismjs.highlightAll();
    };

    onMounted(() => {
      prismjs.highlightAll();
    });

    return {
      count,
      status,
      setStatus
    };
  }
};
</script>

<style lang="scss">
@import url('@/assets/css/prism.css');

.informations {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 32px;
  .content {
    width: 100%;
    max-width: 900px;
    .block {
      display: flex;
      flex-direction: column;
      margin: 16px 0;
      .title {
        color: var(--title);
        font-weight: bold;
      }
      h2 {
        font-size: 28px;
        margin: 16px 0 20px;
      }
      h3 {
        font-size: 24px;
        margin: 16px 0 20px;
      }
      h4 {
        font-size: 20px;
        margin-bottom: 16px;
      }
      .title-container {
        position: relative;
        text-decoration: none !important;
        .title {
          cursor: pointer;
          display: flex;
          align-items: center;
          &::after {
            content: '#';
            position: absolute;
            left: -16px;
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
        font-size: 15px;
        color: var(--text);
        line-height: 20px;
        font-weight: 600;
        &.text {
          margin-bottom: 16px;
        }
      }
    }
  }
  // p {
  //   font-size: 14px;
  //   margin: 8px 0 16px;
  //   color: #404040;
  //   font-weight: 600;
  //   line-height: 20px;
  // }
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
</style>
