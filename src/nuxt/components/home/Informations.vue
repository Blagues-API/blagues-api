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

      <DocNode v-show="doc === 'npm'" />
      <DocPyPi v-show="doc === 'pypi'" />
      <DocAPI v-show="doc === 'api'" />

      <div id="thanks" class="block">
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
import prismjs from 'prismjs'

import { mapState } from 'vuex'

import Jokes from '@/../../src/jokes'

import DocNode from '@/components/docs/DocNode.vue'
import DocPyPi from '@/components/docs/DocPyPi.vue'
import DocAPI from '@/components/docs/DocAPI.vue'

export default {
  components: {
    DocNode,
    DocPyPi,
    DocAPI,
  },
  computed: {
    ...mapState(['doc']),
    count() {
      return Jokes.count
    },
  },
  watch: {
    async doc() {
      await new Promise((resolve) => setTimeout(resolve(), 1000))
      prismjs.highlightAll()
    },
  },
  mounted() {
    prismjs.highlightAll()
  },
}
</script>

<style lang="scss">
@import url('@/assets/css/prism.css');

.informations {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;

  .content {
    width: 100%;
    max-width: 900px;

    .block {
      display: flex;
      flex-direction: column;
      margin: 16px 0;

      .flex-space {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;

        &.top {
          align-items: center;
          @media screen and (max-width: 430px) {
            flex-direction: column-reverse;
            align-items: flex-start;

            .selector {
              width: 100%;
            }
          }
        }

        .buttons {
          display: flex;
          align-self: flex-end;
          margin-bottom: 16px;

          .button {
            display: flex;
            min-height: 32px;
            margin-left: 16px;
            padding: 6px 16px;
            transition: 0.3s color ease, 0.3s border-color ease;
            border: 2px solid #d7d7d7;
            border-radius: 4px;
            background-color: #ffffff;
            color: #2e4657;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;

            &.active {
              border-color: #0098ff;
              color: #0098ff;
            }

            &:first-child {
              margin-left: 0;
            }
          }
        }
      }

      .title {
        color: var(--title);
        font-weight: bold;
      }

      h2 {
        margin: 16px 0 20px;
        font-size: 28px;
      }

      h3 {
        margin: 16px 0 20px;
        font-size: 24px;
      }

      h4 {
        margin-bottom: 16px;
        font-size: 20px;
      }

      .title-container {
        position: relative;
        text-decoration: none !important;

        .title {
          display: flex;
          align-items: center;
          cursor: pointer;

          &::after {
            content: '#';
            position: absolute;
            left: -16px;
            transition: 0.1s opacity ease-in-out;
            opacity: 0;
            color: #c5c5c5;
            font-size: 18px;
            font-weight: 400;
          }

          &:hover::after {
            opacity: 1;
          }
        }
      }

      p {
        color: var(--text);
        font-size: 15px;
        font-weight: 600;
        line-height: 20px;

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
        top: 0;
        right: 0;
        background-color: #002b36;

        button.copy-to-clipboard-button {
          display: flex;
          position: relative;
          justify-content: center;
          width: 20px;
          height: 22px;
          margin: 17px 17px 17px 8px;
          background-image: url("data:image/svg+xml;utf8,<svg width='20' height='22' viewBox='0 0 20 22' fill='none' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' clip-rule='evenodd' d='M15.4824 2.49935V3.8833H17.5883H17.59V3.88688C18.2552 3.88867 18.8581 4.16797 19.2934 4.62093C19.7253 5.07031 19.9948 5.69157 19.9965 6.37907H20V6.38265V19.5007V19.5024H19.9965C19.9948 20.1899 19.7253 20.8148 19.2882 21.2677C18.8546 21.7153 18.2552 21.9946 17.5918 21.9964V22H17.5883H6.92926H6.92753V21.9964C6.26414 21.9946 5.6595 21.7153 5.22415 21.2624C4.79226 20.813 4.52276 20.1917 4.52103 19.5042H4.51758V19.5007V16.5627H2.41168H2.40995V16.5591C1.74657 16.5573 1.14192 16.278 0.706573 15.825C0.274683 15.3757 0.00518269 14.7544 0.00345513 14.0669H0V14.0633V2.49935V2.49756H0.00345513C0.00518269 1.80827 0.27641 1.18343 0.711756 0.732259C1.14537 0.284668 1.74484 0.00537109 2.40822 0.00358073V0H2.41168H13.0707H13.0725V0.00358073C13.7376 0.00537109 14.3405 0.284668 14.7758 0.73763C15.2077 1.18701 15.4772 1.80827 15.479 2.49577H15.4824V2.49935ZM13.6547 3.8833V2.49935V2.49577H13.6581C13.6581 2.33285 13.5907 2.18245 13.4836 2.07145C13.3783 1.96224 13.2314 1.89242 13.0742 1.89242V1.896H13.0725H2.41341H2.40995V1.89242C2.25274 1.89242 2.10763 1.96224 2.00052 2.07324C1.89514 2.18245 1.82776 2.33464 1.82776 2.49756H1.83122V2.49935V14.0633V14.0669H1.82776C1.82776 14.2298 1.89514 14.3802 2.00225 14.4912C2.10763 14.6004 2.25447 14.6702 2.41168 14.6702V14.6667H2.41341H4.51931V6.38265V6.38086H4.52276C4.52449 5.69157 4.79572 5.06673 5.23106 4.61556C5.66468 4.16797 6.26414 3.88867 6.92753 3.88688V3.8833H6.93098H13.6547ZM18.1705 19.5007V6.38265V6.37907H18.174C18.174 6.21615 18.1066 6.06576 17.9995 5.95475C17.8941 5.84554 17.7473 5.77572 17.59 5.77572V5.7793H17.5883H6.92926H6.9258V5.77572C6.76859 5.77572 6.62348 5.84554 6.51637 5.95654C6.41099 6.06576 6.34361 6.21794 6.34361 6.38086H6.34707V6.38265V19.5007V19.5042H6.34361C6.34361 19.6672 6.41099 19.8175 6.5181 19.9285C6.62348 20.0378 6.77032 20.1076 6.92753 20.1076V20.104H6.92926H17.5883H17.5918V20.1076C17.749 20.1076 17.8941 20.0378 18.0012 19.9268C18.1066 19.8175 18.174 19.6654 18.174 19.5024H18.1705V19.5007Z' fill='white' fill-opacity='0.4'/></svg>");
          cursor: pointer;

          span {
            position: absolute;
            top: 100%;
            padding: 2px 4px;
            transition: 0.3s transform ease, 0.3s opacity ease;
            border-radius: 3px;
            opacity: 0;
            background-color: #668086;
            color: white;
            font-size: 12px;
            white-space: nowrap;
            user-select: none;
          }

          &:hover span {
            transform: translateY(6px);
            opacity: 1;
          }
        }
      }
    }
  }

  .example {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 8px;
    }

    .language {
      margin: 0 0 6px 2px;
      color: #8b8b8b;
      font-size: 12px;
      font-weight: bold;
    }
  }
}
</style>
