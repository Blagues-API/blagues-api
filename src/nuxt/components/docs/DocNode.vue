<template>
  <div>
    <div id="install" class="block">
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
            Yarn
          </button>
          <button
            class="button"
            :class="{ active: versions.js_install === 'pnpm' }"
            @click="updateVersion('js_install', 'pnpm')"
          >
            Pnpm
          </button>
          <button
            class="button"
            :class="{ active: versions.js_install === 'npm' }"
            @click="updateVersion('js_install', 'npm')"
          >
            Npm
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
      <div v-show="versions.js_install === 'pnpm'">
        <pre>
          <code class="language-bash">
            pnpm add blagues-api
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
    <div id="setup" class="block">
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
      <p class="text">
        Il est fortement conseillé d'utiliser les variables d'environnement avec
        <a href="https://www.npmjs.com/package/dotenv">dotenv</a> afin de ne pas
        mettre votre token dans le code source de votre projet.
      </p>
    </div>
    <div id="use" class="block">
      <a href="#use" class="title-container">
        <h3 class="title">Utilisation</h3>
      </a>
      <p class="text">
        Différentes méthodes vous sont rendues disponibles afin d'intéragir plus
        facilement avec l'API depuis votre projet.
      </p>
      <div id="random-joke" class="block">
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
      <div id="random-categorized-joke" class="block">
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
      <div id="joke-by-id" class="block">
        <a href="#joke-by-id" class="title-container">
          <h4 class="title">Blague à partir de son ID</h4>
        </a>
        <p class="text">
          Les blagues sont identifiées par un ID que vous recevez en même tant
          que chaque blague. Spécifiez cet identifiant en paramètre et vous
          l'obtiendez à nouveau.
        </p>
        <pre>
          <code class="language-javascript">
            const blague = await blagues.fromId(50);
          </code>
        </pre>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from '@nuxtjs/composition-api'

export default {
  setup() {
    const versions = reactive({
      js_install: 'yarn',
      js_setup: 'cjs',
    })

    const updateVersion = (key, value) => {
      versions[key] = value
    }

    return {
      versions,
      updateVersion,
    }
  },
}
</script>
