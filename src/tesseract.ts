import Api from './api';
import Bot from './bot';

export default class Tesseract {
  public bot: Bot;
  public api: Api;

  constructor() {
    this.bot = new Bot();
    this.api = new Api();

    this.init();
  }

  async init(): Promise<void> {
    await Promise.all([
      // eslint-disable-next-line
      this.api.start(),
      this.bot.start()
    ]);
  }
}
