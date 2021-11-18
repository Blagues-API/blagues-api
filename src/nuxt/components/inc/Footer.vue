<template>
  <footer>
    <div class="copyright">
      <div>
        Blagues API © 2019-{{ new Date().getFullYear() }}
        <a href="https://www.draftman.fr" title="DraftMan Developer"
          >DraftMan</a
        >
      </div>
      <span class="separator">|</span>
      <div>
        Powered by
        <a href="https://www.draftbot.fr" title="DraftBot Discord Bot"
          >DraftBot</a
        >
      </div>
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
  min-height: 40px;
  .copyright {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ffffff;
    font-weight: bold;
    font-size: 14px;
    line-height: 22px;
    padding: 8px 0;
    a {
      text-decoration: none;
    }
    .separator {
      margin: 0 8px;
    }
    @media screen and(max-width: 720px) {
      flex-direction: column;
      .separator {
        display: none;
      }
    }
  }
}
</style>
