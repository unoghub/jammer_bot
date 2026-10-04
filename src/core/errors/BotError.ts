export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly publicMessage: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BotError";
  }
}
