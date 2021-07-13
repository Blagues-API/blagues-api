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
        <button id="next" @click="refreshJoke()">UNE AUTRE !</button>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent, ref, onMounted } from '@nuxtjs/composition-api';

import jokes from '../../../../../blagues.json';

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

    const refreshJoke = () => {
      joke.value = jokes[Math.floor(Math.random() * jokes.length)];
    };

    onMounted(() => {
      refreshJoke();
    });

    return {
      joke,
      refreshJoke,
      jokesTypes
    };
  }
});
</script>

<style lang="scss">
.hero {
  background-color: var(--bluewood);
  padding: 40px;
  @media (max-width: 420px) {
    padding: 40px 20px;
  }
  .joke {
    display: flex;
    flex-direction: column;
    background: var(--white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    max-width: 900px;
    width: 100%;
    padding: 20px;
    font-weight: bold;
    margin: 0 auto;
    .content {
      font-size: 22px;
      line-height: 30px;
      color: #0067ad;
      margin-bottom: 16px;
      @media (max-width: 420px) {
        font-size: 18px;
        line-height: 24px;
      }
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      .joke_type {
        color: #888888;
        font-size: 16px;
        @media (max-width: 420px) {
          font-size: 14px;
        }
      }
      #next {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px;
        background-color: var(--matisse);
        padding: 10px 16px;
        font-size: 15px;
        color: var(--white);
        font-weight: bold;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.3s;
        &:hover {
          background-color: var(--matisse-dark);
        }
      }
    }
  }
}
</style>
