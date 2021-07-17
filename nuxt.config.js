export default {
  components: false,
  srcDir: './src/app/nuxt',
  buildModules: ['@nuxtjs/composition-api/module'],
  modules: ['@nuxtjs/axios', '@nuxtjs/auth'],
  css: ['./assets/reset.css'],

  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {},

  /*
   ** Auth module configuration
   ** See https://dev.auth.nuxtjs.org/schemes/local.html#options
   */
  auth: {
    strategies: {
      discord: {
        scheme: 'oauth2',
        endpoints: {
          authorization: 'https://discord.com/api/oauth2/authorize',
          token: 'https://discord.com/api/oauth2/token',
          userInfo: 'https://discord.com/api/v6/users/@me'
        },
        token: {
          global: false
        },
        refreshToken: {
          property: 'refresh_token',
          maxAge: 604800
        },
        responseType: 'code',
        redirectUri: `${process.env.BASE_URL}/login/callback`,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scope: ['identify'],
        grantType: 'authorization_code',
        codeChallengeMethod: 'S256'
      }
    },
    redirect: {
      callback: '/login/callback',
      login: '/',
      logout: '/',
      home: '/'
    }
  }
};
