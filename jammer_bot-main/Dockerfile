FROM oven/bun:1 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
RUN HUSKY=0 bun install --frozen-lockfile

FROM oven/bun:1

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json drizzle.config.ts ./
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun src ./src

USER bun
CMD ["sh", "-c", "bun run db:migrate && exec bun run src/main.ts"]
