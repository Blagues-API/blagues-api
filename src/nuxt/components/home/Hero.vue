<template>
  <section class="hero">
    <div class="wrapper">
      <div class="content">
        <h2>Besoin d’une <b>API</b> de <b>blagues</b> françaises ?</h2>
        <div class="tags">
          <div class="line">
            <span class="tag">#collaborative</span
            ><span class="tag">#open-source</span>
          </div>
          <div class="line">
            <span class="tag">#communautaire</span
            ><span class="tag">#français</span>
          </div>
        </div>
        <div class="buttons">
          <button class="button npm">
            <NpmIcon class="icon" />
            <span class="name">NPM</span>
          </button>
          <button class="button pypi">
            <PyPiIcon class="icon" />
            <span class="name">PY<span>PI</span></span>
          </button>
          <button class="button api">
            <ApiIcon class="icon" />
          </button>
        </div>
      </div>
      <!-- <LazyHydrate on-interaction> -->
      <!-- SSR only -->
      <transition name="fade" mode="out-in">
        <client-only>
          <div class="example">
            <transition name="fade" mode="out-in">
              <div v-if="joke" :key="joke.id" class="example-content">
                <p class="type">
                  {{ jokesTypes[joke.type] }}
                </p>
                <p class="joke">
                  {{ joke.joke }}
                </p>
                <p class="spoiler" tabindex="0">
                  <span class="answer">{{ joke.answer }}</span>
                </p>
              </div>
            </transition>
            <button class="next" @click="refreshJoke()">UNE AUTRE !</button>
          </div>
        </client-only>
      </transition>
      <!-- </LazyHydrate> -->
    </div>
    <div class="sroller" @click="scrollToDocs()">
      <div class="name">Documentation</div>
      <DownIcon />
    </div>
    <div ref="docs" class="bottom" />
  </section>
</template>

<script>
import { defineComponent, ref } from '@nuxtjs/composition-api'

// import LazyHydrate from 'vue-lazy-hydration'

import jokes from '../../../../blagues.json'
import NpmIcon from '@/assets/icons/npm.svg?inline'
import PyPiIcon from '@/assets/icons/pypi.svg?inline'
import ApiIcon from '@/assets/icons/api.svg?inline'
import DownIcon from '@/assets/icons/down.svg?inline'

const jokesTypes = {
  limit: 'Blague limite limite',
  global: 'Blague normale',
  dark: 'Blague humour noir',
  dev: 'Blague de développeurs',
  beauf: 'Humour de beaufs',
  blondes: 'Blagues blondes',
}

export default defineComponent({
  components: {
    NpmIcon,
    PyPiIcon,
    ApiIcon,
    DownIcon,
    // LazyHydrate
  },
  setup() {
    const joke = ref(jokes[Math.floor(Math.random() * jokes.length)])
    const docs = ref(null)

    const refreshJoke = () => {
      joke.value = jokes[Math.floor(Math.random() * jokes.length)]
    }

    const scrollToDocs = () => {
      docs.value.scrollIntoView({ behavior: 'smooth' })
    }

    return {
      joke,
      refreshJoke,
      jokesTypes,
      scrollToDocs,
      docs,
    }
  },
})
</script>

<style lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.hero {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: var(--secondary);
  min-height: 60vh;
  padding: 110px 32px 96px;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
  .wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 900px;
    width: 100%;
    .content {
      max-width: 350px;
      h2 {
        font-family: 'Roboto', sans-serif;
        font-weight: 900;
        font-size: 48px;
        line-height: 52px;
        letter-spacing: 0.02em;
        color: var(--white);
        b {
          color: var(--primary);
        }
      }
      .tags {
        max-width: 250px;
        margin: 16px 0;
        .line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          &:last-child {
            margin: 0;
          }
          .tag {
            color: #ffffffa3;
            letter-spacing: 0.02em;
          }
        }
      }
      .buttons {
        margin-top: 24px;
        display: flex;
        .button {
          display: flex;
          align-items: center;
          height: 100%;
          padding: 12px;
          margin-right: 16px;
          border-radius: 7px;
          min-width: 100px;
          cursor: pointer;
          outline: revert;
          .icon {
            height: 22px;
          }
          .name {
            margin-left: 8px;
            font-weight: bold;
            user-select: none;
          }
          &.npm {
            background-color: #cb3837;
            .name {
              color: var(--white);
            }
          }
          &.pypi {
            background-color: var(--white);
            .name {
              color: #3775a9;
            }
          }
          &.api {
            min-width: 0 !important;
            background-color: #3f3f3f;
            margin: 0;
          }
        }
      }
    }
    .example {
      display: flex;
      flex-direction: column;
      background: var(--white);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      .example-content {
        .type {
          font-weight: bold;
          font-size: 18px;
          color: #2e465799;
        }
        .joke {
          font-weight: bold;
          font-size: 24px;
          color: #414141;
        }
        .spoiler {
          background-color: #202225;
          border-radius: 3px;
          transition: background-color 0.3s ease;
          outline: 0;
          cursor: pointer;
          padding: 8px;
          .answer {
            font-weight: 600;
            color: #414141;
            opacity: 0;
            pointer-events: none;
            white-space: pre-wrap;
            transition: opacity 0.3s ease;
          }
          &:focus {
            background-color: #24242452;
            cursor: text;
            .answer {
              opacity: 1;
            }
          }
        }
        p {
          font-size: 22px;
          line-height: 30px;
          color: #0067ad;
          margin-bottom: 16px;
          &.joke_type {
            color: #888888;
            font-size: 16px;
            @media (max-width: 420px) {
              font-size: 14px;
            }
          }
        }
      }

      .next {
        display: flex;
        justify-content: center;
        align-items: center;
        align-self: flex-end;
        height: 40px;
        background-color: var(--primary);
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 15px;
        color: var(--white);
        font-weight: bold;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.3s;
        outline: revert;
        &:hover {
          background-color: var(--primary-dark);
        }
      }
    }
  }
  .sroller {
    display: flex;
    align-items: center;
    position: absolute;
    bottom: 0;
    right: 0;
    margin-bottom: 32px;
    margin-right: 32px;
    cursor: pointer;
    outline: revert;
    height: auto;
    padding: 8px;
    .name {
      color: rgba(255, 255, 255, 0.8);
      margin-right: 8px;
      user-select: none;
    }
    svg {
      color: white;
    }
  }
  .bottom {
    position: absolute;
    bottom: 0;
  }
  @media (max-width: 680px) {
    padding: 64px 48px;
    min-height: 0;
    .wrapper {
      flex-direction: column;
      .content {
        margin-bottom: 48px;
        max-width: 280px;
        h2 {
          font-size: 38px;
          line-height: 44px;
        }
        .buttons {
          .button {
            min-width: 80px;
          }
        }
      }
      .example {
        p {
          line-height: 24px;
          &.type {
            margin-bottom: 8px;
            font-size: 16px;
          }
          &.joke {
            font-size: 20px;
          }
          &.spoiler {
            font-size: 18px;
          }
        }
      }
    }
    .sroller {
      display: none;
    }
  }
}
</style>
