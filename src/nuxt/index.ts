const CLI = require('@nuxt/cli')

const isDev = process.env.NODE_ENV !== 'production'

export default class Nuxt {
  constructor() {}

  async start(): Promise<void> {
    try {
      await CLI.run([isDev ? 'dev' : 'start']);
    } catch (error) {
      console.error(error)
      process.exit(2)
    }
  }
}
