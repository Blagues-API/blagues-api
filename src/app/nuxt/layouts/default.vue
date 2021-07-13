<template>
  <div>
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
  --matisse: #2a75a7;
  --matisse-dark: rgb(38, 100, 141);
  --white: #ffffff;
  --pimp: #0098ff;
  --gallery: #ebebeb;
  --bluewood: #2e4657;
}

body {
  font-family: 'Open Sans', sans-serif;
  .container {
    background-color: var(--gallery);
    min-height: calc(100vh - 110px);
  }
  strong {
    font-weight: bold;
  }
}

a {
  color: var(--matisse);
}
</style>
