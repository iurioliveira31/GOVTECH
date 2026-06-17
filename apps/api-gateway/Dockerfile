FROM node:20-alpine AS alpine
RUN apk update && apk add --no-cache libc6-compat openssl

FROM alpine as base
RUN npm i -g npm@latest

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Faz o prune para isolar apenas as dependências do api-gateway
RUN turbo prune api-gateway --docker

FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
# Gera o Prisma Client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
# Build do projeto
RUN npx turbo run build --filter=api-gateway...

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=installer /app .

EXPOSE 4000

CMD ["node", "apps/api-gateway/dist/main.js"]
