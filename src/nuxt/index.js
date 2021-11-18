/* eslint-disable no-console */
const CLI = require('@nuxt/cli')

const isDev = process.env.NODE_ENV !== 'production'

module.exports = class Nuxt {
  async start() {
    if (process.env.web_service !== 'true') {
      return console.log('Service web désactivé')
    }

    try {
      await CLI.run([isDev ? 'dev' : 'start', __dirname])
    } catch (error) {
      console.error(error)
      process.exit(2)
    }
  }
}
