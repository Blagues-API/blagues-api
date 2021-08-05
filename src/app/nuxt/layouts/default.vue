<template>
  <div :class="$route.name">
    <Header />
    <Nuxt />
    <Footer />
  </div>
</template>

<script>
import Header from '../components/inc/Header';
import Footer from '../components/inc/Footer';

export default {
  components: {
    Header,
    Footer
  }
};
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

body {
  font-family: 'Open Sans', sans-serif;
  .index {
    header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1;
      @media screen and (max-width: 720px) {
        position: sticky;
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
