<template>
  <div class="container">
    <Hero />
    <Informations />
  </div>
</template>

<script>
import Informations from '../components/home/Informations'
import Hero from '../components/home/Hero'

export default {
  components: {
    Informations,
    Hero
  }
}
</script>
