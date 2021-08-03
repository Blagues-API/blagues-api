<template>
  <section class="informations">
    <div
      class="content"
      data-prismjs-copy="Copier"
      data-prismjs-copy-success="Copié !"
      data-prismjs-copy-timeout="2000"
    >
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
      <template v-if="status === 'api'">
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
      <template v-if="status === 'npm'">
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
          <div class="flex-space">
            <a href="#install" class="title-container">
              <h3 class="title">Installation</h3>
            </a>
            <div class="buttons">
              <button
                class="button"
                :class="{ active: versions.js_install === 'yarn' }"
                @click="updateVersion('js_install', 'yarn')"
              >
                YARN
              </button>
              <button
                class="button"
                :class="{ active: versions.js_install === 'npm' }"
                @click="updateVersion('js_install', 'npm')"
              >
                NPM
              </button>
            </div>
          </div>
          <div v-show="versions.js_install === 'yarn'">
            <pre>
              <code class="language-bash">
                yarn add blagues-api
              </code>
            </pre>
          </div>
          <div v-show="versions.js_install === 'npm'">
            <pre>
              <code class="language-bash">
                npm i blagues-api
              </code>
            </pre>
          </div>
        </div>
        <div class="block" id="setup">
          <div class="flex-space">
            <a href="#setup" class="title-container">
              <h3 class="title">Mise en place</h3>
            </a>
            <div class="buttons">
              <button
                class="button"
                :class="{ active: versions.js_setup === 'browser' }"
                @click="updateVersion('js_setup', 'browser')"
              >
                Browser
              </button>
              <button
                class="button"
                :class="{ active: versions.js_setup === 'cjs' }"
                @click="updateVersion('js_setup', 'cjs')"
              >
                CJS
              </button>
              <button
                class="button"
                :class="{ active: versions.js_setup === 'es6' }"
                @click="updateVersion('js_setup', 'es6')"
              >
                ES6
              </button>
            </div>
          </div>
          <div v-show="versions.js_setup === 'browser'">
            <pre>
              <code class="language-javascript">
                &lt;script src="https://unpkg.com/blagues-api@2.1.0/dist/blagues-api.umd.js">&lt;/script>
              </code>
            </pre>
          </div>
          <div v-show="versions.js_setup === 'es6'">
            <pre>
              <code class="language-javascript">
                import BlaguesAPI from 'blagues-api';
              </code>
            </pre>
          </div>
          <div v-show="versions.js_setup === 'cjs'">
            <pre>
              <code class="language-javascript">
                const BlaguesAPI = require('blagues-api');
              </code>
            </pre>
          </div>
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

import { ref, reactive, onMounted } from '@nuxtjs/composition-api';

export default {
  setup() {
    const count = jokes.length;
    const status = ref('npm');
    const versions = reactive({
      js_install: 'yarn',
      js_setup: 'cjs'
    });

    const setStatus = async (name) => {
      status.value = name;
      await new Promise((resolve) => setTimeout(resolve(), 1000));
      prismjs.highlightAll();
    };

    const updateVersion = (key, value) => {
      versions[key] = value;
    };

    onMounted(() => {
      prismjs.highlightAll();
    });

    return {
      count,
      status,
      setStatus,
      versions,
      updateVersion
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
      .flex-space {
        display: flex;
        .buttons {
          display: flex;
          justify-content: flex-end;
          align-self: flex-end;
          margin-bottom: 16px;
          flex: 1;
          .button {
            margin-left: 16px;
            padding: 6px 16px;
            display: flex;
            background-color: #ffffff;
            border: 2px solid #d7d7d7;
            border-radius: 4px;
            font-size: 16px;
            min-height: 32px;
            font-weight: 700;
            color: #2e4657;
            cursor: pointer;
            transition: 0.3s color ease, 0.3s border-color ease;
            &.active {
              border-color: #0098ff;
              color: #0098ff;
            }
          }
        }
      }
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
    .code-toolbar {
      position: relative;
      .toolbar {
        display: flex;
        position: absolute;
        background-color: #002b36;
        top: 0;
        right: 0;
        button.copy-to-clipboard-button {
          display: flex;
          justify-content: center;
          position: relative;
          background-image: url("data:image/svg+xml;utf8,<svg width='20' height='22' viewBox='0 0 20 22' fill='none' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' clip-rule='evenodd' d='M15.4824 2.49935V3.8833H17.5883H17.59V3.88688C18.2552 3.88867 18.8581 4.16797 19.2934 4.62093C19.7253 5.07031 19.9948 5.69157 19.9965 6.37907H20V6.38265V19.5007V19.5024H19.9965C19.9948 20.1899 19.7253 20.8148 19.2882 21.2677C18.8546 21.7153 18.2552 21.9946 17.5918 21.9964V22H17.5883H6.92926H6.92753V21.9964C6.26414 21.9946 5.6595 21.7153 5.22415 21.2624C4.79226 20.813 4.52276 20.1917 4.52103 19.5042H4.51758V19.5007V16.5627H2.41168H2.40995V16.5591C1.74657 16.5573 1.14192 16.278 0.706573 15.825C0.274683 15.3757 0.00518269 14.7544 0.00345513 14.0669H0V14.0633V2.49935V2.49756H0.00345513C0.00518269 1.80827 0.27641 1.18343 0.711756 0.732259C1.14537 0.284668 1.74484 0.00537109 2.40822 0.00358073V0H2.41168H13.0707H13.0725V0.00358073C13.7376 0.00537109 14.3405 0.284668 14.7758 0.73763C15.2077 1.18701 15.4772 1.80827 15.479 2.49577H15.4824V2.49935ZM13.6547 3.8833V2.49935V2.49577H13.6581C13.6581 2.33285 13.5907 2.18245 13.4836 2.07145C13.3783 1.96224 13.2314 1.89242 13.0742 1.89242V1.896H13.0725H2.41341H2.40995V1.89242C2.25274 1.89242 2.10763 1.96224 2.00052 2.07324C1.89514 2.18245 1.82776 2.33464 1.82776 2.49756H1.83122V2.49935V14.0633V14.0669H1.82776C1.82776 14.2298 1.89514 14.3802 2.00225 14.4912C2.10763 14.6004 2.25447 14.6702 2.41168 14.6702V14.6667H2.41341H4.51931V6.38265V6.38086H4.52276C4.52449 5.69157 4.79572 5.06673 5.23106 4.61556C5.66468 4.16797 6.26414 3.88867 6.92753 3.88688V3.8833H6.93098H13.6547ZM18.1705 19.5007V6.38265V6.37907H18.174C18.174 6.21615 18.1066 6.06576 17.9995 5.95475C17.8941 5.84554 17.7473 5.77572 17.59 5.77572V5.7793H17.5883H6.92926H6.9258V5.77572C6.76859 5.77572 6.62348 5.84554 6.51637 5.95654C6.41099 6.06576 6.34361 6.21794 6.34361 6.38086H6.34707V6.38265V19.5007V19.5042H6.34361C6.34361 19.6672 6.41099 19.8175 6.5181 19.9285C6.62348 20.0378 6.77032 20.1076 6.92753 20.1076V20.104H6.92926H17.5883H17.5918V20.1076C17.749 20.1076 17.8941 20.0378 18.0012 19.9268C18.1066 19.8175 18.174 19.6654 18.174 19.5024H18.1705V19.5007Z' fill='white' fill-opacity='0.4'/></svg>");
          width: 20px;
          height: 22px;
          margin: 17px 17px 17px 8px;
          cursor: pointer;
          span {
            color: white;
            font-size: 12px;
            position: absolute;
            top: 100%;
            padding: 2px 4px;
            background-color: #668086;
            border-radius: 3px;
            opacity: 0;
            transition: 0.3s transform ease, 0.3s opacity ease;
            user-select: none;
            white-space: nowrap;
          }
          &:hover span {
            opacity: 1;
            transform: translateY(6px);
          }
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
