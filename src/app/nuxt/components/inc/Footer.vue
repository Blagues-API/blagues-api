<template>
  <footer>
    <div class="copyright">
      Blagues API © 2019-2021
      <a href="https://www.draftman.fr" title="DraftMan Developer">DraftMan</a>
      | Powered by
      <a
        href="https://www.draftbot.fr"
        title="DraftBot Discord Bot"
      >DraftBot</a>
    </div>
  </footer>
</template>

<style lang="scss">
footer {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--secondary);
  color: var(--white);
  height: 40px;
  .copyright {
    color: #ffffff;
    font-weight: bold;
    font-size: 14px;
    line-height: 22px;
    a {
      text-decoration: none;
    }
  }
}
</style>
