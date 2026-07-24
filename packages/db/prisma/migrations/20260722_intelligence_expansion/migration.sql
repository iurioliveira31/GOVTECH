-- ================================================================
-- Migration: 20260722_intelligence_expansion
-- Expansão do schema para LicitaAI Intelligence v2
-- Execute via: psql $DATABASE_URL -f migration.sql
-- Ou dentro da VPS: docker exec -i <container_db> psql -U postgres aplicativo_dev < migration.sql
-- ================================================================

-- ─── Novos ENUMs ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BandaOportunidade') THEN
    CREATE TYPE "BandaOportunidade" AS ENUM ('A', 'B', 'C', 'D');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusAdesao') THEN
    CREATE TYPE "StatusAdesao" AS ENUM ('PENDENTE', 'ASSINADO', 'VENCIDO', 'NAO_APLICAVEL');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FonteDocumento') THEN
    CREATE TYPE "FonteDocumento" AS ENUM (
      'SESLEGIS', 'PORTAL_ANTIGO_SES', 'DOU_INLABS',
      'DIARIO_OFICIAL_MG', 'QUERIDO_DIARIO', 'DOMM_AMM', 'IOF_MG', 'MANUAL'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoAto') THEN
    CREATE TYPE "TipoAto" AS ENUM (
      'RESOLUCAO', 'DELIBERACAO', 'PORTARIA', 'NOTA_TECNICA', 'INSTRUCAO_NORMATIVA', 'OUTROS'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstagioRecurso') THEN
    CREATE TYPE "EstagioRecurso" AS ENUM (
      'INDICADO', 'APROVADO', 'EMPENHADO', 'PAGO', 'DISPONIVEL', 'EXECUCAO', 'CONCLUIDO', 'CANCELADO'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoEventoRecurso') THEN
    CREATE TYPE "TipoEventoRecurso" AS ENUM (
      'PORTARIA_FEDERAL', 'RESOLUCAO_SES', 'TERMO_ADESAO', 'EMPENHO',
      'PAGAMENTO', 'PCA', 'DFD', 'COTACAO', 'EDITAL', 'CONTRATO', 'ATUALIZACAO'
    );
  END IF;
END$$;

-- ─── Tabela Municipio ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Municipio" (
  "ibge"           TEXT NOT NULL PRIMARY KEY,
  "nome"           TEXT NOT NULL,
  "uf"             TEXT NOT NULL,
  "cnpjPrefeitura" TEXT,
  "cnpjFms"        TEXT,
  "mesoregiao"     TEXT,
  "microrregiao"   TEXT,
  "populacao"      INTEGER,
  "ondePublica"    TEXT,
  "prioritario"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Municipio_uf_idx" ON "Municipio"("uf");
CREATE INDEX IF NOT EXISTS "Municipio_mesoregiao_idx" ON "Municipio"("mesoregiao");
CREATE INDEX IF NOT EXISTS "Municipio_cnpjFms_idx" ON "Municipio"("cnpjFms");

-- ─── Tabela EquipamentoCategoria ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "EquipamentoCategoria" (
  "codigo"    TEXT NOT NULL PRIMARY KEY,
  "nome"      TEXT NOT NULL,
  "sinonimos" TEXT[] NOT NULL DEFAULT '{}',
  "segmento"  TEXT,
  "ativo"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EquipamentoCategoria_segmento_idx" ON "EquipamentoCategoria"("segmento");

-- ─── Tabela TenantWalletConfig ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TenantWalletConfig" (
  "id"                    TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"              TEXT NOT NULL UNIQUE,
  "ibgesMunicipios"       TEXT[] NOT NULL DEFAULT '{}',
  "tier1Ibges"            TEXT[] NOT NULL DEFAULT '{}',
  "tier2Ibges"            TEXT[] NOT NULL DEFAULT '{}',
  "mesorregioes"          TEXT[] NOT NULL DEFAULT '{}',
  "categoriasEquipamento" TEXT[] NOT NULL DEFAULT '{}',
  "bandaMinima"           "BandaOportunidade" NOT NULL DEFAULT 'B',
  "fontes"                "FonteDocumento"[] NOT NULL DEFAULT '{}',
  "palavrasChaveExtra"    TEXT[] NOT NULL DEFAULT '{}',
  "alertaWhatsapp"        TEXT,
  "alertaEmail"           TEXT,
  "alertaTelegram"        TEXT,
  "ativo"                 BOOLEAN NOT NULL DEFAULT true,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantWalletConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TenantWalletConfig_tenantId_idx" ON "TenantWalletConfig"("tenantId");

-- ─── Novos campos em Resolution ───────────────────────────────────────────────

ALTER TABLE "Resolution"
  ADD COLUMN IF NOT EXISTS "fonte"           "FonteDocumento" NOT NULL DEFAULT 'SESLEGIS',
  ADD COLUMN IF NOT EXISTS "tipoAto"         "TipoAto" NOT NULL DEFAULT 'RESOLUCAO',
  ADD COLUMN IF NOT EXISTS "numeroPortaria"   TEXT,
  ADD COLUMN IF NOT EXISTS "programaFederal"  TEXT,
  ADD COLUMN IF NOT EXISTS "valorTotal"       DECIMAL(24,4),
  ADD COLUMN IF NOT EXISTS "prazoAdesao"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusAdesao"     "StatusAdesao" NOT NULL DEFAULT 'NAO_APLICAVEL',
  ADD COLUMN IF NOT EXISTS "score"            INTEGER,
  ADD COLUMN IF NOT EXISTS "banda"            "BandaOportunidade",
  ADD COLUMN IF NOT EXISTS "hashConteudo"     TEXT,
  ADD COLUMN IF NOT EXISTS "origemDocumento"  TEXT,
  ADD COLUMN IF NOT EXISTS "recursoId"        TEXT;

CREATE INDEX IF NOT EXISTS "Resolution_dataPublicacao_idx" ON "Resolution"("dataPublicacao");
CREATE INDEX IF NOT EXISTS "Resolution_banda_idx" ON "Resolution"("banda");
CREATE INDEX IF NOT EXISTS "Resolution_prazoAdesao_idx" ON "Resolution"("prazoAdesao");
CREATE INDEX IF NOT EXISTS "Resolution_fonte_idx" ON "Resolution"("fonte");

-- ─── Novos campos em ResolutionItem ──────────────────────────────────────────

ALTER TABLE "ResolutionItem"
  ADD COLUMN IF NOT EXISTS "ibgeMunicipio"         TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjBeneficiario"      TEXT,
  ADD COLUMN IF NOT EXISTS "categoriaEquipamento"  TEXT,
  ADD COLUMN IF NOT EXISTS "prazoExecucao"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusAdesao"          "StatusAdesao",
  ADD COLUMN IF NOT EXISTS "quantidadeEquipamento" INTEGER;

CREATE INDEX IF NOT EXISTS "ResolutionItem_ibgeMunicipio_idx" ON "ResolutionItem"("ibgeMunicipio");
CREATE INDEX IF NOT EXISTS "ResolutionItem_categoriaEquipamento_idx" ON "ResolutionItem"("categoriaEquipamento");

-- ─── Novos campos em ResolutionAlert ─────────────────────────────────────────

ALTER TABLE "ResolutionAlert"
  ADD COLUMN IF NOT EXISTS "ibgesMunicipios"       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "mesorregioes"           TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "micros"                 TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "categoriasEquipamento"  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "bandaMinima"             "BandaOportunidade",
  ADD COLUMN IF NOT EXISTS "fontes"                  "FonteDocumento"[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "telegram"                TEXT;

-- ─── Novos campos em CrmAccount ──────────────────────────────────────────────

ALTER TABLE "CrmAccount"
  ADD COLUMN IF NOT EXISTS "cnpj"          TEXT,
  ADD COLUMN IF NOT EXISTS "ibgeMunicipio" TEXT,
  ADD COLUMN IF NOT EXISTS "tipoOrgao"     TEXT,
  ADD COLUMN IF NOT EXISTS "cnes"          TEXT;

CREATE INDEX IF NOT EXISTS "CrmAccount_cnpj_idx" ON "CrmAccount"("cnpj");
CREATE INDEX IF NOT EXISTS "CrmAccount_ibgeMunicipio_idx" ON "CrmAccount"("ibgeMunicipio");

-- ─── Novos campos em CrmOpportunity ──────────────────────────────────────────

ALTER TABLE "CrmOpportunity"
  ADD COLUMN IF NOT EXISTS "recursoId"       TEXT,
  ADD COLUMN IF NOT EXISTS "ibgeMunicipio"   TEXT,
  ADD COLUMN IF NOT EXISTS "tipoEquipamento" TEXT,
  ADD COLUMN IF NOT EXISTS "bandaOrigem"     TEXT,
  ADD COLUMN IF NOT EXISTS "motivoPerda"     TEXT,
  ADD COLUMN IF NOT EXISTS "scoreAtual"      INTEGER;

CREATE INDEX IF NOT EXISTS "CrmOpportunity_recursoId_idx" ON "CrmOpportunity"("recursoId");

-- ─── Tabela RecursoPublico ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecursoPublico" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "chaveRecurso"      TEXT NOT NULL UNIQUE,
  "tipo"              TEXT NOT NULL,
  "ibgeMunicipio"     TEXT NOT NULL,
  "cnpjBeneficiario"  TEXT,
  "nomeBeneficiario"  TEXT,
  "valor"             DECIMAL(24,4),
  "objeto"            TEXT,
  "categoriaEquipamento" TEXT,
  "programa"          TEXT,
  "estagio"           "EstagioRecurso" NOT NULL DEFAULT 'INDICADO',
  "score"             INTEGER NOT NULL DEFAULT 0,
  "banda"             "BandaOportunidade" NOT NULL DEFAULT 'D',
  "prazoExecucao"     TIMESTAMP(3),
  "dataUltimoEvento"  TIMESTAMP(3),
  "fonteOrigem"       "FonteDocumento" NOT NULL,
  "pncpContratacaoId" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecursoPublico_ibgeMunicipio_fkey" FOREIGN KEY ("ibgeMunicipio") REFERENCES "Municipio"("ibge") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecursoPublico_ibgeMunicipio_idx" ON "RecursoPublico"("ibgeMunicipio");
CREATE INDEX IF NOT EXISTS "RecursoPublico_banda_idx" ON "RecursoPublico"("banda");
CREATE INDEX IF NOT EXISTS "RecursoPublico_estagio_idx" ON "RecursoPublico"("estagio");
CREATE INDEX IF NOT EXISTS "RecursoPublico_cnpjBeneficiario_idx" ON "RecursoPublico"("cnpjBeneficiario");
CREATE INDEX IF NOT EXISTS "RecursoPublico_dataUltimoEvento_idx" ON "RecursoPublico"("dataUltimoEvento");

-- FK Resolution -> RecursoPublico
ALTER TABLE "Resolution"
  ADD CONSTRAINT IF NOT EXISTS "Resolution_recursoId_fkey"
  FOREIGN KEY ("recursoId") REFERENCES "RecursoPublico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK CrmOpportunity -> RecursoPublico
ALTER TABLE "CrmOpportunity"
  ADD CONSTRAINT IF NOT EXISTS "CrmOpportunity_recursoId_fkey"
  FOREIGN KEY ("recursoId") REFERENCES "RecursoPublico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Tabela RecursoEvento ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecursoEvento" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "recursoId"   TEXT NOT NULL,
  "tipo"        "TipoEventoRecurso" NOT NULL,
  "descricao"   TEXT NOT NULL,
  "documento"   TEXT,
  "valor"       DECIMAL(24,4),
  "data"        TIMESTAMP(3) NOT NULL,
  "fonte"       "FonteDocumento" NOT NULL,
  "confianca"   DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "revisadoPor" TEXT,
  "metadados"   JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecursoEvento_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "RecursoPublico"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecursoEvento_recursoId_data_idx" ON "RecursoEvento"("recursoId", "data");
CREATE INDEX IF NOT EXISTS "RecursoEvento_tipo_idx" ON "RecursoEvento"("tipo");

-- ─── Tabela DouPortaria ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DouPortaria" (
  "id"                   TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "numeroPortaria"       TEXT NOT NULL UNIQUE,
  "tipo"                 TEXT NOT NULL,
  "secao"                TEXT,
  "dataPublicacao"       TIMESTAMP(3) NOT NULL,
  "orgaoEmissor"         TEXT,
  "resumoIa"             TEXT,
  "valorTotal"           DECIMAL(24,4),
  "ufAlvo"               TEXT,
  "categoriaEquipamento" TEXT,
  "urlOriginal"          TEXT,
  "xmlOrigem"            TEXT,
  "hashConteudo"         TEXT UNIQUE,
  "recursoId"            TEXT,
  "status"               "ResolutionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DouPortaria_dataPublicacao_idx" ON "DouPortaria"("dataPublicacao");
CREATE INDEX IF NOT EXISTS "DouPortaria_tipo_idx" ON "DouPortaria"("tipo");
CREATE INDEX IF NOT EXISTS "DouPortaria_status_idx" ON "DouPortaria"("status");
CREATE INDEX IF NOT EXISTS "DouPortaria_ufAlvo_idx" ON "DouPortaria"("ufAlvo");

CREATE TABLE IF NOT EXISTS "DouPortariaMunicipio" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portariaId" TEXT NOT NULL,
  "ibge"       TEXT NOT NULL,
  CONSTRAINT "DouPortariaMunicipio_portariaId_ibge_key" UNIQUE ("portariaId", "ibge"),
  CONSTRAINT "DouPortariaMunicipio_portariaId_fkey" FOREIGN KEY ("portariaId") REFERENCES "DouPortaria"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DouPortariaMunicipio_ibge_fkey" FOREIGN KEY ("ibge") REFERENCES "Municipio"("ibge") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DouPortariaMunicipio_ibge_idx" ON "DouPortariaMunicipio"("ibge");

-- ─── Tabela DiarioMunicipal ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DiarioMunicipal" (
  "id"                   TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fonte"                "FonteDocumento" NOT NULL,
  "ibgeMunicipio"        TEXT NOT NULL,
  "dataPublicacao"       TIMESTAMP(3) NOT NULL,
  "tipo"                 TEXT NOT NULL,
  "titulo"               TEXT,
  "conteudo"             TEXT,
  "resumoIa"             TEXT,
  "valorEnvolvido"       DECIMAL(24,4),
  "categoriaEquipamento" TEXT,
  "urlOriginal"          TEXT,
  "hashConteudo"         TEXT UNIQUE,
  "recursoId"            TEXT,
  "status"               "ResolutionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiarioMunicipal_ibgeMunicipio_fkey" FOREIGN KEY ("ibgeMunicipio") REFERENCES "Municipio"("ibge") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DiarioMunicipal_ibgeMunicipio_idx" ON "DiarioMunicipal"("ibgeMunicipio");
CREATE INDEX IF NOT EXISTS "DiarioMunicipal_dataPublicacao_idx" ON "DiarioMunicipal"("dataPublicacao");
CREATE INDEX IF NOT EXISTS "DiarioMunicipal_tipo_idx" ON "DiarioMunicipal"("tipo");
CREATE INDEX IF NOT EXISTS "DiarioMunicipal_status_idx" ON "DiarioMunicipal"("status");

-- ─── Tabela InvestSusRegistro ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InvestSusRegistro" (
  "id"                   TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ibgeMunicipio"        TEXT NOT NULL,
  "tipo"                 TEXT NOT NULL,
  "numeroInstrumento"    TEXT,
  "parlamentar"          TEXT,
  "objeto"               TEXT,
  "valor"                DECIMAL(24,4),
  "dataReferencia"       TIMESTAMP(3) NOT NULL,
  "categoriaEquipamento" TEXT,
  "recursoId"            TEXT,
  "origem"               TEXT NOT NULL DEFAULT 'CSV_MANUAL',
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestSusRegistro_ibgeMunicipio_fkey" FOREIGN KEY ("ibgeMunicipio") REFERENCES "Municipio"("ibge") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InvestSusRegistro_ibgeMunicipio_idx" ON "InvestSusRegistro"("ibgeMunicipio");
CREATE INDEX IF NOT EXISTS "InvestSusRegistro_tipo_idx" ON "InvestSusRegistro"("tipo");
CREATE INDEX IF NOT EXISTS "InvestSusRegistro_dataReferencia_idx" ON "InvestSusRegistro"("dataReferencia");

-- ─── Tabela FilaRevisao ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FilaRevisao" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entidadeTipo" TEXT NOT NULL,
  "entidadeId"   TEXT NOT NULL,
  "motivo"       TEXT NOT NULL,
  "extracao"     JSONB,
  "confianca"    DOUBLE PRECISION,
  "status"       TEXT NOT NULL DEFAULT 'PENDENTE',
  "revisadoPor"  TEXT,
  "revisadoEm"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FilaRevisao_entidadeTipo_status_idx" ON "FilaRevisao"("entidadeTipo", "status");
CREATE INDEX IF NOT EXISTS "FilaRevisao_status_idx" ON "FilaRevisao"("status");

-- ─── Tabela CollectorRun ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CollectorRun" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fonte"            "FonteDocumento" NOT NULL,
  "iniciadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluidoEm"      TIMESTAMP(3),
  "status"           TEXT NOT NULL DEFAULT 'RUNNING',
  "itensLidos"       INTEGER NOT NULL DEFAULT 0,
  "itensNovos"       INTEGER NOT NULL DEFAULT 0,
  "itensAtualizados" INTEGER NOT NULL DEFAULT 0,
  "itensRejeitados"  INTEGER NOT NULL DEFAULT 0,
  "itensErro"        INTEGER NOT NULL DEFAULT 0,
  "proximaExecucao"  TIMESTAMP(3),
  "ultimoErro"       TEXT,
  "metadados"        JSONB
);

CREATE INDEX IF NOT EXISTS "CollectorRun_fonte_status_idx" ON "CollectorRun"("fonte", "status");
CREATE INDEX IF NOT EXISTS "CollectorRun_iniciadoEm_idx" ON "CollectorRun"("iniciadoEm");

-- ─── Registrar migração no histórico Prisma ────────────────────────────────────
-- (será feito automaticamente quando a migração rodar via prisma migrate)

-- ─── Adicionar DESCARTADA ao enum ResolutionStatus ──────────────────────────
-- Resoluções classificadas pela IA como administrativas/convalidações são
-- salvas com este status e NUNCA exibidas na UI do LicitaAI.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'ResolutionStatus'::regtype
      AND enumlabel = 'DESCARTADA'
  ) THEN
    ALTER TYPE "ResolutionStatus" ADD VALUE 'DESCARTADA';
  END IF;
END$$;

-- ─── FIM DA MIGRAÇÃO ──────────────────────────────────────────────────────────
