FROM node:20-alpine AS alpine
RUN apk update && apk add --no-cache libc6-compat openssl

FROM alpine as base
RUN npm i -g npm@latest

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Faz o prune para isolar apenas as dependências do web
RUN turbo prune web --docker

FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/packages/db ./packages/db
# Gera o Prisma Client com a versão 5 para evitar erro da versão 7
RUN npx prisma@5 generate --schema=packages/db/prisma/schema.prisma

ENV NEXT_TELEMETRY_DISABLED 1
# Build do projeto web
RUN npx turbo run build --filter=web...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Next.js standalone mode bundles necessary node_modules
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
