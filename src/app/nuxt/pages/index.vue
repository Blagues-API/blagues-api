<template>
  <section class="hero">
    <div class="joke" v-if="joke">
      <div class="content">
        <span id="joke">{{ joke.joke }}</span
        ><br />
        <span id="answer">{{ joke.answer }}</span>
      </div>
      <div class="footer">
        <div class="joke_type" id="type">
          {{ jokesTypes[joke.type] }}
        </div>
        <button id="next" @click="fetchJoke()">UNE AUTRE !</button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@vue/composition-api';

// import jokes from '../../../../blagues.json';

const jokesTypes = {
  limit: 'Blague limite limite',
  global: 'Blague normale',
  dark: 'Blague humour noir',
  dev: 'Blague de développeurs',
  beauf: 'Humour de beaufs',
  blondes: 'Blagues blondes'
};

export default defineComponent({
  setup() {
    const joke = ref(null);

    const fetchJoke = async () => {
      // joke.value = jokes[Math.floor(Math.random() * jokes.length)];
    };

    onMounted(() => {
      fetchJoke();
    });

    return {
      joke,
      fetchJoke,
      jokesTypes
    };
  }
});
</script>
