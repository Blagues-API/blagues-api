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
          <button class="button npm" @click="scrollToDocs('npm')">
            <NpmIcon class="icon" />
            <span class="name">NPM</span>
          </button>
          <button class="button pypi" @click="scrollToDocs('pypi')">
            <PyPiIcon class="icon" />
            <span class="name">PY<span>PI</span></span>
          </button>
          <button class="button api">
            <ApiIcon class="icon" @click="scrollToDocs('api')" />
          </button>
        </div>
      </div>
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
            <button class="next" @click="rerollJoke()">UNE AUTRE !</button>
          </div>
        </client-only>
      </transition>
    </div>
    <div class="sroller" @click="scrollToDocs()">
      <div class="name">Documentation</div>
      <DownIcon />
    </div>
    <div ref="docs" class="bottom" />
  </section>
</template>

<script>
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

export default {
  components: {
    NpmIcon,
    PyPiIcon,
    ApiIcon,
    DownIcon,
  },
  data() {
    return {
      jokesTypes,
      joke: jokes[Math.floor(Math.random() * jokes.length)],
    }
  },
  methods: {
    rerollJoke() {
      this.joke = jokes[Math.floor(Math.random() * jokes.length)]
    },
    scrollToDocs(doc) {
      if (doc) this.$store.commit('SET_DOC', doc)
      const rect = this.$refs.docs.getBoundingClientRect()
      window.scroll({
        top:
          window.pageYOffset +
          rect.top -
          rect.height +
          (this.$device.isMobile ? 96 : 0),
        left: 0,
        behavior: 'smooth',
      })
    },
  },
}
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
  position: relative;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 110px 32px 96px;
  background-color: var(--secondary);
  box-shadow: 0 4px 4px rgb(0 0 0 / 25%);

  .wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 900px;

    .content {
      max-width: 350px;

      h2 {
        color: var(--white);
        font-family: Roboto, sans-serif;
        font-size: 48px;
        font-weight: 900;
        letter-spacing: 0.02em;
        line-height: 52px;

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
        display: flex;
        margin-top: 24px;

        .button {
          display: flex;
          align-items: center;
          min-width: 100px;
          height: 100%;
          margin-right: 16px;
          padding: 12px;
          border-radius: 6px;
          outline: revert;
          cursor: pointer;

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
            margin: 0;
            background-color: #3f3f3f;
          }
        }
      }
    }

    .example {
      display: flex;
      flex-direction: column;
      max-width: 450px;
      padding: 24px;
      border-radius: 12px;
      background: var(--white);
      box-shadow: 0 2px 8px rgb(0 0 0 / 50%);

      .example-content {
        .type {
          color: #2e465799;
          font-size: 18px;
          font-weight: bold;
        }

        .joke {
          color: #414141;
          font-size: 24px;
          font-weight: bold;
        }

        .spoiler {
          padding: 8px;
          transition: background-color 0.3s ease;
          border-radius: 3px;
          outline: 0;
          background-color: #202225;
          cursor: pointer;

          .answer {
            transition: opacity 0.3s ease;
            opacity: 0;
            color: #414141;
            font-weight: 600;
            white-space: pre-wrap;
            pointer-events: none;
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
          margin-bottom: 16px;
          color: #0067ad;
          font-size: 22px;
          line-height: 30px;
        }
      }

      .next {
        display: flex;
        align-items: center;
        align-self: flex-end;
        justify-content: center;
        height: 40px;
        padding: 10px 16px;
        transition: background-color 0.3s;
        border-radius: 6px;
        outline: revert;
        background-color: var(--primary);
        color: var(--white);
        font-size: 15px;
        font-weight: bold;
        white-space: nowrap;
        cursor: pointer;

        &:hover {
          background-color: var(--primary-dark);
        }
      }
    }
  }

  .sroller {
    display: flex;
    position: absolute;
    right: 0;
    bottom: 0;
    align-items: center;
    height: auto;
    margin-right: 32px;
    margin-bottom: 32px;
    padding: 8px;
    outline: revert;
    cursor: pointer;

    .name {
      margin-right: 8px;
      color: rgb(255 255 255 / 80%);
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
    min-height: 0;
    padding: 64px 48px;

    .wrapper {
      flex-direction: column;

      .content {
        max-width: 280px;
        margin-bottom: 48px;

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
