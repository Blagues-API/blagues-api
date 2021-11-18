<template>
  <div>
    <div id="api" class="block">
      <div class="flex-space top">
        <h2 class="title">Module PyPi</h2>
        <Selector />
      </div>
      <p>
        Le module PyPi de Blagues-API supporte l'intégralité des options
        présente sur l'API, il permettra d'intéragir simplement avec l'API
        depuis le langage Python de manière asynchrone.
      </p>
    </div>
    <div id="install" class="block">
      <div class="flex-space">
        <a href="#install" class="title-container">
          <h3 class="title">Installation</h3>
        </a>
      </div>
      <div>
        <pre>
          <code class="language-bash">
            pip install blagues-api
          </code>
        </pre>
      </div>
    </div>
    <div id="setup" class="block">
      <div class="flex-space">
        <a href="#setup" class="title-container">
          <h3 class="title">Mise en place</h3>
        </a>
      </div>
      <pre>
        <code class="language-javascript">
          from blagues_api import BlaguesAPI
        </code>
      </pre>
      <pre>
        <code class="language-javascript">
          blagues = BlaguesAPI("<mark>VOTRE_TOKEN_ICI</mark>")
        </code>
      </pre>
      <p class="text">
        Il est fortement conseillé d'utiliser les variables d'environnement avec
        <a href="https://pypi.org/project/python-dotenv">dotenv</a> afin de ne
        pas mettre votre token dans le code source de votre projet.
      </p>
    </div>
    <div id="use" class="block">
      <a href="#use" class="title-container">
        <h3 class="title">Utilisation</h3>
      </a>
      <p class="text">
        Différentes méthodes asynchrones vous sont rendues disponibles afin
        d'intéragir plus facilement avec l'API depuis votre projet.
      </p>
      <div id="random-joke" class="block">
        <a href="#random-joke" class="title-container">
          <h4 class="title">Blague aléatoire</h4>
        </a>
        <pre>
          <code class="language-javascript">
            const blague = await blagues.random()
          </code>
        </pre>
        <p class="text">
          A cette méthode, vous pouvez spécifier certains types que vous ne
          souhaitez pas recevoir.
        </p>
        <pre>
          <code class="language-javascript">
            const blague = await blagues.random(disallow=[BlagueType.LIMIT, BlagueType.BEAUF])
          </code>
        </pre>
      </div>
      <div id="random-categorized-joke" class="block">
        <a href="#random-categorized-joke" class="title-container">
          <h4 class="title">Blague aléatoire d'une catégorie</h4>
        </a>
        <pre>
          <code class="language-javascript">
            const blague = await blagues.random_categorized(BlagueType.DEV)
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
            const blague = await blagues.from_id(50)
          </code>
        </pre>
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
