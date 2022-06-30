import Api from './api';
import Bot from './bot';

export default class Tesseract {
  public bot: Bot;
  public api: Api;

  constructor() {
    this.bot = new Bot();
    this.api = new Api();
  }

  async init(): Promise<void> {
    try {
      await Promise.all([
        // eslint-disable-next-line prettier/prettier
        this.api.start(),
        this.bot.start()
      ]);
    } catch (error) {
      console.error(error);
    }
  }
}
