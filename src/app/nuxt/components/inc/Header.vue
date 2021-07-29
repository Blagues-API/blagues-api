<template>
  <header>
    <a class="brand" href="/" title="Accueil">
      <Logo class="logo" />
      <h1 class="name">BLAGUES API</h1>
    </a>
    <div class="navigation">
      <a
        class="item"
        href="https://github.com/DraftProducts/blagues-api"
        title="Github de Blagues API"
        >GITHUB</a
      >
      <a
        class="item"
        href="https://discord.gg/PPNpVaF"
        title="Discord de Blagues API"
        >DISCORD</a
      >
      <nuxt-link class="user-place" v-if="$auth.loggedIn" to="/account">
        <div
          class="avatar"
          :style="{
            'background-image': `url('https://cdn.discordapp.com/avatars/${$auth.user.id}/${$auth.user.avatar}.png?size=64')`
          }"
        ></div>
        <span class="username">{{ $auth.user.username }}</span>
      </nuxt-link>
      <span
        class="item rounded"
        v-else
        @click="$auth.loginWith('discord')"
        title="Connexion Discord"
        >CONNEXION</span
      >
    </div>
  </header>
</template>

<script>
import Logo from '@/assets/logo.svg?inline';

export default {
  components: {
    Logo
  }
};
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
    width: 60%;
    margin-right: 8%;
    user-select: none;
    cursor: pointer;
    text-decoration: none;
    @media (max-width: 720px) {
      width: 100%;
      justify-content: center;
      margin-right: 0;
    }

    .logo {
      width: 70px;
      height: 70px;
    }

    .name {
      color: var(--primary);
      margin-left: 6px;
      font-size: 26px;
      font-weight: 800;
      text-shadow: 1px 1px 3px #000000cc;
    }
  }
  .navigation {
    display: flex;
    align-items: center;

    @media (max-width: 720px) {
      width: 100%;
      justify-content: center;
      padding: 12px;
    }

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
      @media (max-width: 420px) {
        margin: 10px 5px;
      }
    }
    .user-place {
      display: flex;
      align-items: center;
      margin: 0 10px;
      @media (max-width: 420px) {
        margin: 0 5px;
      }
      .avatar {
        background-size: 32px;
        height: 36px;
        width: 36px;
        border-radius: 18px;
        border: 2px solid var(--white);
        @media (max-width: 420px) {
          display: none;
        }
      }
      .username {
        margin-left: 8px;
        text-transform: none;
        font-weight: 600;
        font-size: 18px;
        color: white;
        @media (max-width: 420px) {
          font-size: 16px;
          margin-left: 0;
        }
      }
    }
  }
}
</style>
