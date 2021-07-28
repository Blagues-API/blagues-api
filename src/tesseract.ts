import App from './app';
import Bot from './bot';

export default class Tesseract {
  public bot: Bot;
  public app: App;

  constructor() {
    this.bot = new Bot();
    this.app = new App();

    this.init();
  }

  async init() {
    await this.app.start();
    await this.bot.start();
  }
}
