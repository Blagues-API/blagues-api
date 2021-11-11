<template>
  <header v-body-scroll-lock="open">
    <nuxt-link class="brand" to="/" title="Accueil">
      <Logo class="logo" />
      <h1 class="name">BLAGUES API</h1>
    </nuxt-link>
    <div class="overlay" :class="{ open }" @click="open = false" />
    <div class="navigation" :class="{ open }">
      <a
        class="item"
        href="https://github.com/DraftProducts/blagues-api"
        title="Github de Blagues API"
      >
        GITHUB
      </a>
      <a
        class="item"
        href="https://discord.gg/PPNpVaF"
        title="Discord de Blagues API"
      >
        DISCORD
      </a>
      <nuxt-link v-if="$auth.loggedIn" class="user-place" to="/account">
        <div
          class="avatar"
          :style="{
            'background-image': `url('https://cdn.discordapp.com/avatars/${$auth.user.id}/${$auth.user.avatar}.png?size=64')`,
          }"
        />
        <span class="username">{{ $auth.user.username }}</span>
      </nuxt-link>
      <span
        v-else
        class="item rounded"
        title="Connexion Discord"
        @click="$auth.loginWith('discord')"
      >
        CONNEXION
      </span>
    </div>
    <div class="burger" :class="{ open }" @click="open = !open">
      <div class="burger-lines" />
    </div>
  </header>
</template>

<script>
import Logo from '@/assets/logo.svg?inline'

export default {
  components: {
    Logo,
  },
  data() {
    return {
      open: false,
    }
  },
}
</script>

<style lang="scss">
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--secondary);
  padding: 16px 20px;
  .brand {
    display: flex;
    align-items: center;
    margin-right: 8%;
    user-select: none;
    cursor: pointer;
    text-decoration: none;

    .logo {
      width: 64px;
      height: 64px;
    }

    .name {
      color: var(--primary);
      margin-left: 6px;
      font-size: 26px;
      font-weight: 800;
      text-shadow: 1px 1px 3px #000000cc;
      white-space: nowrap;
    }
  }
  .burger {
    display: none;
    height: 40px;
    width: 40px;
    position: relative;
    font-size: 12px;
    cursor: pointer;
    transition: 0.2s all;
    margin-right: 8px;
    z-index: 3;
    -webkit-tap-highlight-color: transparent;
    .burger-lines {
      top: 50%;
      margin-top: -2.5px;
      width: 28px;
      &,
      &::after,
      &::before {
        pointer-events: none;
        display: block;
        content: '';
        border-radius: 2.5px;
        background-color: var(--primary);
        height: 5px;
        position: absolute;
        right: 0;
        transform: rotate(0);
        transition: 0.2s top 0.2s, 0.1s left, 0.2s transform,
          0.4s background-color 0.2s, 0s width 0.15s;
      }
      &::after {
        width: 38px;
        top: -14px;
      }
      &::before {
        width: 18px;
        top: 14px;
      }
    }

    &.open {
      .burger-lines {
        background-color: transparent;
        &,
        &::after,
        &::before {
          transition: 0.2s background-color, 0.2s top, 0.2s left,
            0.2s transform 0.15s, 0s width 0.15s;
        }
        &::before,
        &::after {
          width: 38px;
          top: 0;
        }
        &::before {
          transform: rotate(-45deg);
        }
        &::after {
          transform: rotate(45deg);
        }
      }
    }
  }
  .navigation {
    display: flex;
    align-items: center;
    .item {
      font-weight: 600;
      margin: 16px;
      text-decoration: none;
      color: var(--primary);
      cursor: pointer;
      &.rounded {
        display: flex;
        padding: 10px 16px;
        background-color: var(--primary);
        color: var(--white);
        border-radius: 18px;
      }
    }
    .user-place {
      display: flex;
      align-items: center;
      margin: 0 10px;
      text-decoration: none;
      .avatar {
        background-size: 32px;
        height: 36px;
        width: 36px;
        border-radius: 18px;
        border: 2px solid var(--white);
      }
      .username {
        margin-left: 8px;
        text-transform: none;
        font-weight: 600;
        font-size: 18px;
        color: white;
      }
    }
  }
  @media screen and (max-width: 720px) {
    .burger {
      display: flex;
    }
    .navigation {
      display: none;
    }
  }
}
</style>
