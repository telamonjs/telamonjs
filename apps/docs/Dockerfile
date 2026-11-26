# The docs site (Fumadocs on Next.js standalone). Build context = repo root,
# because pnpm's catalog and the workspace packages live there:
#   docker build -f apps/docs/Dockerfile -t telamonjs-docs .
#
# The live previews render the real @telamonjs/ui from its dist/, so the
# workspace closure (logger, data -> ui -> docs) is built first: the
# `@telamonjs/docs...` filter builds it in topological order.
# lib/versions.ts reads every packages/*/package.json at build time.

FROM node:22.23.5-alpine3.23 AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/logger/package.json packages/logger/
COPY packages/data/package.json packages/data/
COPY packages/ui/package.json packages/ui/
COPY apps/docs/package.json apps/docs/
# fumadocs-mdx's postinstall reads source.config.ts
COPY apps/docs/source.config.ts apps/docs/
RUN pnpm install --filter @telamonjs/docs... --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY packages packages
COPY apps/docs apps/docs
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @telamonjs/docs... run build

FROM node:22.23.5-alpine3.23 AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/apps/docs/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/docs/.next/static ./apps/docs/.next/static
# standalone output leaves public/ out
COPY --from=build --chown=node:node /app/apps/docs/public ./apps/docs/public
USER node
EXPOSE 3000
CMD ["node", "apps/docs/server.js"]
