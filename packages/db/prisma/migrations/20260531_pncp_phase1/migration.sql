-- ============================================================
-- PNCP Phase 1 Migration
-- Adds all PNCP entities: órgãos, licitações, contratos, atas,
-- dispensas, inexigibilidades, contratações diretas, PCA, itens,
-- fornecedores, documentos e sync state.
-- ============================================================

-- ---------------------------------------------------------------
-- Enums PNCP
-- ---------------------------------------------------------------

CREATE TYPE "PncpModalidade" AS ENUM (
  'LEILAO_ELETRONICO',
  'DIALOGO_COMPETITIVO',
  'CONCURSO',
  'CONCORRENCIA_ELETRONICA',
  'CONCORRENCIA_PRESENCIAL',
  'PREGAO_ELETRONICO',
  'PREGAO_PRESENCIAL',
  'DISPENSA',
  'INEXIGIBILIDADE',
  'MANIFESTACAO_INTERESSE',
  'PRE_QUALIFICACAO',
  'CREDENCIAMENTO',
  'LEILAO_PRESENCIAL'
);

CREATE TYPE "PncpSituacaoContratacao" AS ENUM (
  'DIVULGADA',
  'REVOGADA',
  'ANULADA',
  'SUSPENSA'
);

CREATE TYPE "PncpSituacaoItem" AS ENUM (
  'EM_ANDAMENTO',
  'HOMOLOGADO',
  'ANULADO_REVOGADO_CANCELADO',
  'DESERTO',
  'FRACASSADO'
);

CREATE TYPE "PncpTipoContrato" AS ENUM (
  'CONTRATO',
  'COMODATO',
  'ARRENDAMENTO',
  'CONCESSAO',
  'TERMO_ADESAO',
  'CONVENIO',
  'EMPENHO',
  'OUTROS',
  'TED',
  'ACT',
  'TERMO_COMPROMISSO',
  'CARTA_CONTRATO'
);

CREATE TYPE "PncpEsfera" AS ENUM (
  'FEDERAL',
  'ESTADUAL',
  'MUNICIPAL',
  'DISTRITAL'
);

CREATE TYPE "PncpPoder" AS ENUM (
  'LEGISLATIVO',
  'EXECUTIVO',
  'JUDICIARIO'
);

CREATE TYPE "SyncStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'PARTIAL'
);

CREATE TYPE "SyncEntityType" AS ENUM (
  'CONTRATACAO',
  'CONTRATO',
  'ATA',
  'PCA',
  'ORGAO',
  'ITEM',
  'FORNECEDOR',
  'DISPENSA',
  'INEXIGIBILIDADE'
);

-- ---------------------------------------------------------------
-- PncpOrgao — Órgãos compradores
-- ---------------------------------------------------------------
CREATE TABLE "PncpOrgao" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "cnpj"            TEXT NOT NULL UNIQUE,
  "razaoSocial"     TEXT NOT NULL,
  "poderId"         "PncpPoder",
  "esferaId"        "PncpEsfera",
  "ufSigla"         TEXT,
  "ufNome"          TEXT,
  "municipioIbge"   TEXT,
  "municipioNome"   TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "idx_pncp_orgao_uf" ON "PncpOrgao" ("ufSigla");
CREATE INDEX "idx_pncp_orgao_esfera" ON "PncpOrgao" ("esferaId");

-- ---------------------------------------------------------------
-- PncpContratacao — Licitações, dispensas, inexigibilidades
-- ---------------------------------------------------------------
CREATE TABLE "PncpContratacao" (
  "id"                         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "numeroControlePncp"         TEXT NOT NULL UNIQUE,
  "numeroCompra"               TEXT,
  "anoCompra"                  INTEGER NOT NULL,
  "sequencialCompra"           INTEGER NOT NULL,
  "processo"                   TEXT,

  -- Modalidade e tipo
  "modalidadeId"               INTEGER NOT NULL,
  "modalidadeNome"             TEXT NOT NULL,
  "modalidade"                 "PncpModalidade",
  "modoDisputaId"              INTEGER,
  "modoDisputaNome"            TEXT,
  "tipoInstrumentoId"          INTEGER,
  "tipoInstrumentoNome"        TEXT,
  "situacaoId"                 INTEGER NOT NULL DEFAULT 1,
  "situacaoNome"               TEXT,
  "situacao"                   "PncpSituacaoContratacao" NOT NULL DEFAULT 'DIVULGADA',
  "categoriaProcessoId"        INTEGER,
  "categoriaProcessoNome"      TEXT,

  -- Conteúdo
  "objetoCompra"               TEXT,
  "informacaoComplementar"     TEXT,
  "srp"                        BOOLEAN NOT NULL DEFAULT false,
  "orcamentoSigiloso"          BOOLEAN NOT NULL DEFAULT false,

  -- Valores
  "valorTotalEstimado"         DECIMAL(24,4),
  "valorTotalHomologado"       DECIMAL(24,4),

  -- Datas
  "dataAberturaProposta"       TIMESTAMPTZ,
  "dataEncerramentoProposta"   TIMESTAMPTZ,
  "dataPublicacaoPncp"         DATE,
  "dataInclusao"               DATE,
  "dataAtualizacao"            TIMESTAMPTZ,

  -- Amparo legal
  "amparoLegalCodigo"          INTEGER,
  "amparoLegalNome"            TEXT,
  "amparoLegalDescricao"       TEXT,

  -- Órgão
  "orgaoCnpj"                  TEXT NOT NULL,
  "orgaoRazaoSocial"           TEXT,
  "orgaoPoderId"               TEXT,
  "orgaoEsferaId"              TEXT,
  "unidadeCodigo"              TEXT,
  "unidadeNome"                TEXT,
  "unidadeCodigoIbge"          TEXT,
  "unidadeMunicipioNome"       TEXT,
  "unidadeUfSigla"             TEXT,
  "unidadeUfNome"              TEXT,

  -- Órgão subrogado (se houver)
  "orgaoSubrogadoCnpj"         TEXT,
  "orgaoSubrogadoRazaoSocial"  TEXT,
  "unidadeSubrogadaCodigo"     TEXT,
  "unidadeSubrogadaNome"       TEXT,
  "unidadeSubrogadaUfSigla"    TEXT,
  "unidadeSubrogadaMunicipioNome" TEXT,

  -- Sistema origem
  "usuarioNome"                TEXT,
  "linkSistemaOrigem"          TEXT,
  "justificativaPresencial"    TEXT,

  -- Controle interno
  "hashConteudo"               TEXT,
  "sincronizadoEm"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "fk_contratacao_orgao" FOREIGN KEY ("orgaoCnpj")
    REFERENCES "PncpOrgao" ("cnpj") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_contratacao_orgao_cnpj"  ON "PncpContratacao" ("orgaoCnpj");
CREATE INDEX "idx_contratacao_modalidade"  ON "PncpContratacao" ("modalidadeId");
CREATE INDEX "idx_contratacao_situacao"    ON "PncpContratacao" ("situacao");
CREATE INDEX "idx_contratacao_pub_date"    ON "PncpContratacao" ("dataPublicacaoPncp");
CREATE INDEX "idx_contratacao_enc_prop"    ON "PncpContratacao" ("dataEncerramentoProposta");
CREATE INDEX "idx_contratacao_uf"          ON "PncpContratacao" ("unidadeUfSigla");
CREATE INDEX "idx_contratacao_valor"       ON "PncpContratacao" ("valorTotalEstimado");
CREATE INDEX "idx_contratacao_updated"     ON "PncpContratacao" ("dataAtualizacao");

-- ---------------------------------------------------------------
-- PncpItemContratacao — Itens de licitação
-- ---------------------------------------------------------------
CREATE TABLE "PncpItemContratacao" (
  "id"                     TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contratacaoId"          TEXT NOT NULL,
  "numeroItem"             INTEGER NOT NULL,

  "descricao"              TEXT,
  "materialOuServico"      TEXT,  -- M ou S
  "tipoBeneficioId"        INTEGER,
  "tipoBeneficioNome"      TEXT,
  "incentivoProdutivoBasico" BOOLEAN,
  "criterioJulgamentoId"   INTEGER,
  "criterioJulgamentoNome" TEXT,
  "situacaoId"             INTEGER,
  "situacaoNome"           TEXT,
  "situacao"               "PncpSituacaoItem",
  "unidadeMedida"          TEXT,
  "quantidade"             DECIMAL(18,4),
  "valorUnitarioEstimado"  DECIMAL(24,4),
  "valorTotal"             DECIMAL(24,4),
  "orcamentoSigiloso"      BOOLEAN NOT NULL DEFAULT false,
  "dataAtualizacao"        TIMESTAMPTZ,

  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("contratacaoId", "numeroItem"),
  CONSTRAINT "fk_item_contratacao" FOREIGN KEY ("contratacaoId")
    REFERENCES "PncpContratacao" ("id") ON DELETE CASCADE
);

CREATE INDEX "idx_item_contratacao" ON "PncpItemContratacao" ("contratacaoId");
CREATE INDEX "idx_item_situacao"    ON "PncpItemContratacao" ("situacao");

-- ---------------------------------------------------------------
-- PncpResultadoItem — Resultado/vencedor de item
-- ---------------------------------------------------------------
CREATE TABLE "PncpResultadoItem" (
  "id"                        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "itemId"                    TEXT NOT NULL,
  "sequencialResultado"       INTEGER NOT NULL,

  "tipoPessoa"                TEXT,  -- PJ, PF, PE
  "niFornecedor"              TEXT,  -- CNPJ/CPF
  "nomeFornecedor"            TEXT,
  "porteEmpresaId"            INTEGER,
  "porteEmpresaNome"          TEXT,
  "situacaoId"                INTEGER,
  "situacaoNome"              TEXT,
  "valorUnitario"             DECIMAL(24,4),
  "quantidade"                DECIMAL(18,4),
  "valorTotal"                DECIMAL(24,4),
  "marca"                     TEXT,
  "modelo"                    TEXT,
  "dataResultado"             DATE,
  "dataAtualizacao"           TIMESTAMPTZ,

  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("itemId", "sequencialResultado"),
  CONSTRAINT "fk_resultado_item" FOREIGN KEY ("itemId")
    REFERENCES "PncpItemContratacao" ("id") ON DELETE CASCADE
);

CREATE INDEX "idx_resultado_item"      ON "PncpResultadoItem" ("itemId");
CREATE INDEX "idx_resultado_fornecedor" ON "PncpResultadoItem" ("niFornecedor");

-- ---------------------------------------------------------------
-- PncpContrato — Contratos firmados
-- ---------------------------------------------------------------
CREATE TABLE "PncpContrato" (
  "id"                         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "numeroControlePncp"         TEXT NOT NULL UNIQUE,
  "numeroControlePncpCompra"   TEXT,
  "numeroContratoEmpenho"      TEXT,
  "anoContrato"                INTEGER NOT NULL,
  "sequencialContrato"         INTEGER NOT NULL,
  "processo"                   TEXT,

  -- Tipo e categoria
  "tipoContratoId"             INTEGER,
  "tipoContratoNome"           TEXT,
  "tipoContrato"               "PncpTipoContrato",
  "categoriaProcessoId"        INTEGER,
  "categoriaProcessoNome"      TEXT,
  "receita"                    BOOLEAN NOT NULL DEFAULT false,

  -- Conteúdo
  "objetoContrato"             TEXT,
  "informacaoComplementar"     TEXT,

  -- Fornecedor
  "tipoPessoa"                 TEXT,
  "niFornecedor"               TEXT,
  "nomeRazaoSocialFornecedor"  TEXT,
  "tipoPessoaSubcontratada"    TEXT,
  "niFornecedorSubcontratado"  TEXT,
  "nomeFornecedorSubcontratado" TEXT,

  -- Valores
  "valorInicial"               DECIMAL(24,4),
  "numeroParcelas"             INTEGER,
  "valorParcela"               DECIMAL(24,4),
  "valorGlobal"                DECIMAL(24,4),
  "valorAcumulado"             DECIMAL(24,4),

  -- Datas
  "dataAssinatura"             DATE,
  "dataVigenciaInicio"         DATE,
  "dataVigenciaFim"            DATE,
  "dataPublicacaoPncp"         TIMESTAMPTZ,
  "dataAtualizacao"            TIMESTAMPTZ,

  -- Retificações
  "numeroRetificacao"          INTEGER NOT NULL DEFAULT 0,

  -- Órgão
  "orgaoCnpj"                  TEXT NOT NULL,
  "orgaoRazaoSocial"           TEXT,
  "orgaoPoderId"               TEXT,
  "orgaoEsferaId"              TEXT,
  "unidadeCodigo"              TEXT,
  "unidadeNome"                TEXT,
  "unidadeCodigoIbge"          TEXT,
  "unidadeMunicipioNome"       TEXT,
  "unidadeUfSigla"             TEXT,
  "unidadeUfNome"              TEXT,

  -- Órgão subrogado
  "orgaoSubrogadoCnpj"         TEXT,
  "unidadeSubrogadaCodigo"     TEXT,
  "unidadeSubrogadaNome"       TEXT,

  -- CIPI
  "identificadorCipi"          TEXT,
  "urlCipi"                    TEXT,

  -- Sistema
  "usuarioNome"                TEXT,

  -- Controle
  "hashConteudo"               TEXT,
  "sincronizadoEm"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "fk_contrato_orgao" FOREIGN KEY ("orgaoCnpj")
    REFERENCES "PncpOrgao" ("cnpj") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_contrato_orgao_cnpj"   ON "PncpContrato" ("orgaoCnpj");
CREATE INDEX "idx_contrato_fornecedor"   ON "PncpContrato" ("niFornecedor");
CREATE INDEX "idx_contrato_vigencia_fim" ON "PncpContrato" ("dataVigenciaFim");
CREATE INDEX "idx_contrato_pub_date"     ON "PncpContrato" ("dataPublicacaoPncp");
CREATE INDEX "idx_contrato_updated"      ON "PncpContrato" ("dataAtualizacao");
CREATE INDEX "idx_contrato_tipo"         ON "PncpContrato" ("tipoContratoId");
CREATE INDEX "idx_contrato_uf"           ON "PncpContrato" ("unidadeUfSigla");

-- ---------------------------------------------------------------
-- PncpAta — Atas de registro de preços
-- ---------------------------------------------------------------
CREATE TABLE "PncpAta" (
  "id"                        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "numeroControlePncpAta"     TEXT NOT NULL UNIQUE,
  "numeroControlePncpCompra"  TEXT,
  "numeroAtaRegistroPreco"    TEXT,
  "anoAta"                    INTEGER NOT NULL,
  "sequencialAta"             INTEGER NOT NULL,

  -- Conteúdo
  "objetoContratacao"         TEXT,
  "cancelado"                 BOOLEAN NOT NULL DEFAULT false,

  -- Datas
  "dataAssinatura"            DATE,
  "vigenciaInicio"            DATE,
  "vigenciaFim"               DATE,
  "dataCancelamento"          DATE,
  "dataPublicacaoPncp"        DATE,
  "dataInclusao"              DATE,
  "dataAtualizacao"           TIMESTAMPTZ,

  -- Órgão
  "cnpjOrgao"                 TEXT NOT NULL,
  "nomeOrgao"                 TEXT,
  "codigoUnidadeOrgao"        TEXT,
  "nomeUnidadeOrgao"          TEXT,

  -- Órgão subrogado
  "cnpjOrgaoSubrogado"        TEXT,
  "nomeOrgaoSubrogado"        TEXT,
  "codigoUnidadeSubrogada"    TEXT,
  "nomeUnidadeSubrogada"      TEXT,

  -- Sistema
  "usuario"                   TEXT,

  -- Controle
  "hashConteudo"              TEXT,
  "sincronizadoEm"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "fk_ata_orgao" FOREIGN KEY ("cnpjOrgao")
    REFERENCES "PncpOrgao" ("cnpj") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_ata_orgao"         ON "PncpAta" ("cnpjOrgao");
CREATE INDEX "idx_ata_vigencia_fim"  ON "PncpAta" ("vigenciaFim");
CREATE INDEX "idx_ata_vigencia_ini"  ON "PncpAta" ("vigenciaInicio");
CREATE INDEX "idx_ata_compra"        ON "PncpAta" ("numeroControlePncpCompra");
CREATE INDEX "idx_ata_updated"       ON "PncpAta" ("dataAtualizacao");

-- ---------------------------------------------------------------
-- PncpPca — Plano de Contratações Anual
-- ---------------------------------------------------------------
CREATE TABLE "PncpPca" (
  "id"                    TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "idPcaPncp"             TEXT NOT NULL UNIQUE,
  "anoPca"                INTEGER NOT NULL,
  "cnpjOrgao"             TEXT NOT NULL,
  "razaoSocialOrgao"      TEXT,
  "codigoUnidade"         TEXT,
  "nomeUnidade"           TEXT,
  "dataPublicacaoPncp"    DATE,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "fk_pca_orgao" FOREIGN KEY ("cnpjOrgao")
    REFERENCES "PncpOrgao" ("cnpj") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_pca_orgao" ON "PncpPca" ("cnpjOrgao");
CREATE INDEX "idx_pca_ano"   ON "PncpPca" ("anoPca");

-- ---------------------------------------------------------------
-- PncpItemPca — Itens do PCA
-- ---------------------------------------------------------------
CREATE TABLE "PncpItemPca" (
  "id"                          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pcaId"                       TEXT NOT NULL,
  "numeroItem"                  INTEGER NOT NULL,

  "categoriaItemPcaNome"        TEXT,
  "classificacaoCatalogoId"     TEXT,
  "nomeClassificacaoCatalogo"   TEXT,
  "classificacaoSuperiorCodigo" TEXT,
  "classificacaoSuperiorNome"   TEXT,
  "pdmCodigo"                   TEXT,
  "pdmDescricao"                TEXT,
  "codigoItem"                  TEXT,
  "descricaoItem"               TEXT,
  "unidadeFornecimento"         TEXT,
  "quantidadeEstimada"          DECIMAL(18,4),
  "valorUnitario"               DECIMAL(24,4),
  "valorTotal"                  DECIMAL(24,4),
  "valorOrcamentoExercicio"     DECIMAL(24,4),
  "dataDesejada"                DATE,
  "unidadeRequisitante"         TEXT,
  "grupoContratacaoCodigo"      TEXT,
  "grupoContratacaoNome"        TEXT,
  "dataInclusao"                DATE,
  "dataAtualizacao"             DATE,

  "createdAt"                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("pcaId", "numeroItem"),
  CONSTRAINT "fk_itempca_pca" FOREIGN KEY ("pcaId")
    REFERENCES "PncpPca" ("id") ON DELETE CASCADE
);

CREATE INDEX "idx_itempca_pca" ON "PncpItemPca" ("pcaId");

-- ---------------------------------------------------------------
-- PncpFornecedor — Fornecedores (identificados via resultados)
-- ---------------------------------------------------------------
CREATE TABLE "PncpFornecedor" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ni"              TEXT NOT NULL UNIQUE,  -- CNPJ / CPF / estrangeiro
  "tipoPessoa"      TEXT NOT NULL,          -- PJ, PF, PE
  "nome"            TEXT NOT NULL,
  "porteId"         INTEGER,
  "porteNome"       TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "idx_fornecedor_ni"   ON "PncpFornecedor" ("ni");
CREATE INDEX "idx_fornecedor_nome" ON "PncpFornecedor" ("nome");

-- ---------------------------------------------------------------
-- PncpDocumento — Documentos de contratação/contrato/ata
-- ---------------------------------------------------------------
CREATE TABLE "PncpDocumento" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entidadeTipo"      TEXT NOT NULL,   -- CONTRATACAO, CONTRATO, ATA
  "entidadeId"        TEXT NOT NULL,
  "sequencialDocumento" INTEGER NOT NULL,
  "tipoDocumentoId"   INTEGER,
  "tipoDocumentoNome" TEXT,
  "titulo"            TEXT,
  "url"               TEXT,
  "tamanho"           BIGINT,
  "dataPublicacao"    DATE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("entidadeTipo", "entidadeId", "sequencialDocumento")
);

CREATE INDEX "idx_doc_entidade" ON "PncpDocumento" ("entidadeTipo", "entidadeId");

-- ---------------------------------------------------------------
-- PncpSyncState — Controle de sincronização incremental por entidade
-- ---------------------------------------------------------------
CREATE TABLE "PncpSyncState" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entityType"        "SyncEntityType" NOT NULL,
  "syncKey"           TEXT NOT NULL,           -- ex: "CONTRATACAO:20260101"
  "dataInicial"       DATE NOT NULL,
  "dataFinal"         DATE NOT NULL,
  "status"            "SyncStatus" NOT NULL DEFAULT 'PENDING',
  "totalRegistros"    INTEGER,
  "totalPaginas"      INTEGER,
  "paginaAtual"       INTEGER NOT NULL DEFAULT 1,
  "registrosProcessados" INTEGER NOT NULL DEFAULT 0,
  "registrosInseridos"   INTEGER NOT NULL DEFAULT 0,
  "registrosAtualizados" INTEGER NOT NULL DEFAULT 0,
  "registrosDuplicados"  INTEGER NOT NULL DEFAULT 0,
  "erros"             INTEGER NOT NULL DEFAULT 0,
  "ultimoErro"        TEXT,
  "iniciadoEm"        TIMESTAMPTZ,
  "concluidoEm"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("entityType", "syncKey")
);

CREATE INDEX "idx_sync_entity_type"  ON "PncpSyncState" ("entityType");
CREATE INDEX "idx_sync_status"       ON "PncpSyncState" ("status");
CREATE INDEX "idx_sync_data_inicial" ON "PncpSyncState" ("dataInicial");

-- ---------------------------------------------------------------
-- PncpSyncCursor — Cursor de progresso (qual dia foi sincronizado por último)
-- ---------------------------------------------------------------
CREATE TABLE "PncpSyncCursor" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entityType"        "SyncEntityType" NOT NULL UNIQUE,
  "ultimaDataSync"    DATE NOT NULL,
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);
