<template>
  <div class="container token-page">
    <div class="card">
      <div class="token">
        <div class="language">
          VOTRE TOKEN
        </div>
        <div ref="target" class="code">
          {{ $auth.user.token }}
        </div>
        <div class="buttons">
          <button class="regerate" @click="regenerateToken()">
            {{ regenerated ? 'REGÉNÉRER' : 'REGÉNÉRÉ !' }}
          </button>
          <button class="copy" @click="copyToClipboard()">
            {{ copied ? 'COPIÉ !' : 'COPIER' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, useContext, wrapProperty } from '@nuxtjs/composition-api'

const useAuth = wrapProperty('$auth', false)

export default {
  middleware: ['auth'],
  setup () {
    const target = ref(null)

    const copied = ref(false)
    const regenerated = ref(false)

    const copyToClipboard = () => {
      window.getSelection().removeAllRanges()
      const range = document.createRange()
      range.selectNode(target.value)
      window.getSelection().addRange(range)
      document.execCommand('copy')
      copied.value = true
      setTimeout(() => {
        copied.value = false
        window.getSelection().removeAllRanges()
      }, 2000)
    }

    const regenerateToken = async () => {
      const { $axios } = useContext()
      const { user } = useAuth()
      const newToken = await $axios.$post(
        '/api/regenerate',
        {
          key: user.token_key
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      )
      if (newToken.error) { return }
      regenerated.value = true
      setTimeout(() => {
        regenerated.value = false
        window.getSelection().removeAllRanges()
      }, 2000)
    }

    return { copied, regenerated, copyToClipboard, regenerateToken }
  }
}
</script>

<style lang="scss">
.token-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  @media (max-width: 420px) {
    padding: 40px 20px;
  }
  .head {
    margin-bottom: 40px;
    .title {
      font-weight: bold;
      font-size: 26px;
      color: #0067ad;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 14px;
      text-align: center;
      color: #393939;
      margin-bottom: 3px;
      font-weight: bold; //  600
    }
  }
  .card {
    display: flex;
    flex-direction: column;
    background: var(--white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    max-width: 500px;
    width: 100%;
    padding: 16px;
    margin: 0 auto;
    .token {
      display: flex;
      flex-direction: column;
      .language {
        font-size: 12px;
        color: #8b8b8b;
        margin: 0 0 6px 2px;
        font-weight: bold;
      }
      .code {
        background-color: #202020;
        word-break: break-all;
        padding: 16px;
        color: white;
        line-height: 28px;
        font-size: 14px;
        letter-spacing: 0.5px;
        &::selection {
          background: transparent !important;
        }
        &::-moz-selection {
          background: transparent !important;
        }
      }
      .buttons {
        display: flex;
        margin-top: 10px;
        button {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 40px;
          background-color: var(--primary);
          padding: 10px 16px;
          font-size: 15px;
          color: var(--white);
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s;
          &:first-child {
            margin-right: 10px;
          }
          &:hover {
            background-color: var(--primary-dark);
          }
        }
      }
    }
  }
}
</style>
