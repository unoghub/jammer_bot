import { rm } from "node:fs/promises";

await rm("./out", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/main.ts"],
  outdir: "./out",
  target: "bun",
  format: "esm",
  minify: true,
  splitting: false,
  naming: "main.js",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("Built out/main.js");
