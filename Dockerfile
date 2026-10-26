FROM oven/bun:1 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN HUSKY=0 bun install --frozen-lockfile

FROM oven/bun:1 AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN bun run build

FROM oven/bun:1

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json drizzle.config.ts ./
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun src/infrastructure/database/schema.ts ./src/infrastructure/database/schema.ts
COPY --from=build --chown=bun:bun /app/out ./out

USER bun
CMD ["sh", "-c", "bun run db:migrate && exec bun out/main.js"]
