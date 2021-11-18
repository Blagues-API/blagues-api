<template>
  <div :class="$route.name">
    <Header />
    <transition name="down">
      <Nuxt />
    </transition>
    <Footer />
  </div>
</template>

<script>
import Header from '../components/inc/Header'
import Footer from '../components/inc/Footer'

export default {
  components: {
    Header,
    Footer,
  },
}
</script>

<style lang="scss">
:root {
  --primary: #0098ff;
  --primary-dark: #0079cc;
  --secondary: #002b36;
  --text: #5c5c5c;
  --title: #414141;
  --white: #ffffff;
  --background: #f2f2f2;
}

.down-enter-active,
.down-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.down-enter {
  opacity: 0;
  transform: translateY(-20px);
}

.down-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

body {
  font-family: 'Open Sans', sans-serif;
  .index {
    header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    @media screen and (max-width: 720px) {
      header {
        position: sticky;
      }
      .hero {
        padding-top: 14px;
        min-height: calc(60vh - 96px);
      }
    }
  }
  .container {
    background-color: var(--background);
    min-height: calc(100vh - 110px);
  }
  strong {
    font-weight: bold;
  }
}

a {
  color: var(--primary);
}
</style>
