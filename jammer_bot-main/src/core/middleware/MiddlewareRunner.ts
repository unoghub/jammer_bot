import { injectable } from "tsyringe";
import type { CommandContext } from "../commands/CommandContext.ts";
import type { Middleware } from "./Middleware.ts";

@injectable()
export class MiddlewareRunner {
  private readonly middleware: Middleware[] = [];

  register(middleware: Middleware): void { this.middleware.push(middleware); }

  async run(context: CommandContext, final: () => Promise<void>): Promise<void> {
    const dispatch = async (index: number): Promise<void> => {
      const current = this.middleware[index];
      if (!current) return final();
      let called = false;
      await current.execute(context, async () => {
        if (called) throw new Error("Middleware called next() more than once");
        called = true;
        await dispatch(index + 1);
      });
    };
    await dispatch(0);
  }
}
