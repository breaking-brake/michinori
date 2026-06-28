# Stage 1: Build web app
FROM node:22-slim AS web-builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile --filter @michinori/web...

COPY packages/shared packages/shared
COPY packages/ui packages/ui
COPY packages/web packages/web

RUN pnpm --filter @michinori/web build

# Stage 2: Server + static assets
FROM node:22-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile --filter @michinori/server...

COPY packages/shared packages/shared
COPY packages/server packages/server
COPY --from=web-builder /app/packages/web/dist /app/public

ENV NODE_ENV=production
EXPOSE 8080

CMD ["pnpm", "--filter", "@michinori/server", "start"]
