FROM node:20-alpine AS alpine
RUN apk update && apk add --no-cache libc6-compat openssl

FROM alpine as base

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Faz o prune para isolar apenas as dependências do worker
RUN turbo prune worker --docker

FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# Gera o Prisma Client com a versão 5 para evitar erro da versão 7
RUN npx prisma@5 generate --schema=packages/db/prisma/schema.prisma
# Build do projeto
RUN npx turbo run build --filter=worker...

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=installer /app .

# Worker não expõe porta (exceto métricas se necessário)
CMD ["node", "apps/worker/dist/main.js"]
