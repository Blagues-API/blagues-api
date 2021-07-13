<template>
  <div class="container">
    <JokeDisplay />
    <Informations />
  </div>
</template>

<script>
import Informations from '../components/home/Informations';
import JokeDisplay from '../components/home/JokeDisplay';

export default {
  components: {
    Informations,
    JokeDisplay
  }
};
</script>
