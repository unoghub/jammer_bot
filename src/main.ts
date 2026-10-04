import "reflect-metadata";
import { Bot } from "./app/Bot.ts";
import { registerModules } from "./app/bootstrap.ts";
import { setupContainer } from "./app/container.ts";

const container = setupContainer();
registerModules(container);
const bot = container.resolve(Bot);

let stopping = false;
const shutdown = async (): Promise<void> => {
  if (stopping) return;
  stopping = true;
  await bot.stop();
};
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });

await bot.start();
