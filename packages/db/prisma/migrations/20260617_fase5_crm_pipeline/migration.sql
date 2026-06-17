-- Migration: Fase 5 - CRM Pipeline (Favorites status e valorProposta)
-- Criado em: 2026-06-17

ALTER TABLE "Favorite" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ANALISE';
ALTER TABLE "Favorite" ADD COLUMN "valorProposta" DOUBLE PRECISION;
