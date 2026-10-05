FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY migrations ./migrations

EXPOSE 8080

CMD ["sh", "-c", "bun run migrate && bun run src/server.ts"]