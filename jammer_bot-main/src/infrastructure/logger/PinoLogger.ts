import pino from "pino";
import type { Logger } from "./Logger.ts";

export class PinoLogger implements Logger {
  private readonly delegate = pino({
    transport: {
      target: "pino-pretty"
    }
  });

  debug(message: string, context?: Record<string, unknown>): void { this.delegate.debug(context ?? {}, message); }
  info(message: string, context?: Record<string, unknown>): void { this.delegate.info(context ?? {}, message); }
  warn(message: string, context?: Record<string, unknown>): void { this.delegate.warn(context ?? {}, message); }
  error(message: string, context?: Record<string, unknown>): void { this.delegate.error(context ?? {}, message); }
  flush(): void { this.delegate.flush(); }
}
