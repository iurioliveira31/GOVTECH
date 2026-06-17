-- Migration: Fase 4 - Favorites e Alerts
-- Criado em: 2026-06-17

CREATE TABLE "Favorite" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "label"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Alert" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "keywords"        TEXT[],
    "uf"              TEXT,
    "modalidadeId"    INTEGER,
    "entidade"        TEXT NOT NULL DEFAULT 'todos',
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- Constraints de FK
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint para evitar duplicatas de favorito
CREATE UNIQUE INDEX "Favorite_userId_entityType_entityId_key"
    ON "Favorite"("userId", "entityType", "entityId");

-- Índices de performance
CREATE INDEX "Favorite_userId_idx"          ON "Favorite"("userId");
CREATE INDEX "Favorite_entityType_entityId_idx" ON "Favorite"("entityType", "entityId");
CREATE INDEX "Alert_userId_isActive_idx"    ON "Alert"("userId", "isActive");
