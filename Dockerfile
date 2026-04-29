FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY src ./src
COPY frontend/package.json frontend/bun.lock ./frontend/
COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/index.html ./frontend/

WORKDIR /app/frontend
RUN bun install

COPY frontend/src ./src

RUN bun run build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/frontend-dist ./frontend-dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/src/types.ts ./src/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/types.ts ./src/

RUN bun install --production

EXPOSE 3001

CMD ["src/server.ts"]
