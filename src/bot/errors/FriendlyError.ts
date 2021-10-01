export default class FriendlyError extends Error {
  public code: number;

  constructor(key: number, message: string) {
    super(message);

    this.code = key;
  }
}
