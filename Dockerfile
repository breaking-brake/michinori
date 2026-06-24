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

ENV NODE_ENV=production
EXPOSE 8080

CMD ["pnpm", "--filter", "@michinori/server", "start"]
