export default {
  components: false,
  srcDir: './src/app/nuxt',
  plugins: [
    {
      src: '~/plugins/vue-body-scroll-lock',
      mode: 'client'
    }
  ],
  buildModules: [
    // Doc: https://composition-api.nuxtjs.org
    '@nuxtjs/composition-api/module',
    // Doc: https://github.com/nuxt-community/svg-module
    '@nuxtjs/svg'
  ],
  modules: ['@nuxtjs/axios', '@nuxtjs/auth'],
  css: ['./assets/css/reset.css'],

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
  },

  build: {
    babel: {
      babelrc: false,
      cacheDirectory: undefined,
      presets: ['@nuxt/babel-preset-app'],
      plugins: [
        [
          'prismjs',
          {
            languages: ['javascript', 'bash'],
            plugins: [
              'copy-to-clipboard',
              'normalize-whitespace',
              'keep-markup'
            ],
            css: false
          }
        ]
      ]
    }
  }
};
