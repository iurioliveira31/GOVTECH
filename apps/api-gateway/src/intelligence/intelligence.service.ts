import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Tipos de saída ──────────────────────────────────────────────────────────

export interface OrgaoRadarItem {
  cnpj: string;
  razaoSocial: string;
  uf: string | null;
  municipio: string | null;

  // Atividade geral
  totalLicitacoes: number;
  totalContratos: number;
  totalAtas: number;

  // Valores financeiros
  valorTotalEstimadoLicitacoes: number;  // soma do valor_total_estimado das licitações
  valorTotalContratos: number;           // soma do valor_global dos contratos
  valorMedioLicitacao: number;

  // Tendências (últimos 30 dias vs período anterior)
  licitacoesUltimos30d: number;
  licitacoesPeriodoAnterior: number;
  tendencia: 'ALTA' | 'ESTAVEL' | 'QUEDA';

  // Distribuição de modalidades
  modalidadeTop: string | null;

  // Timing
  dataUltimaLicitacao: string | null;
  dataUltimoContrato: string | null;

  // Score de oportunidade (0-100)
  scoreOportunidade: number;
}

export interface ModalidadeDistribuicao {
  modalidade: string;
  total: number;
  valorTotal: number;
}

export interface TendenciaTemporalItem {
  mes: string; // "2025-01"
  total: number;
  valor: number;
}

export interface OrgaoIntelligenceResponse {
  radar: OrgaoRadarItem[];
  topModalidades: ModalidadeDistribuicao[];
  tendenciaMensal: TendenciaTemporalItem[];
  resumo: {
    totalOrgaosAtivos: number;
    valorTotalMercado: number;
    licitacoesAbertasHoje: number;
    encerrando7dias: number;
  };
}

export interface OportunidadeRanking {
  id: string;
  numeroControlePncp: string;
  objetoCompra: string;
  orgaoRazaoSocial: string | null;
  orgaoCnpj: string | null;
  uf: string | null;
  modalidadeNome: string | null;
  valorTotalEstimado: number | null;
  dataEncerramentoProposta: Date | null;
  dataPublicacaoPncp: Date | null;
  diasRestantes: number;
  scoreOportunidade: number;
  motivos: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── 1. Painel de Radar de Órgãos ─────────────────────────────────────────
  async getOrgaoRadar(
    uf?: string,
    limite = 20,
  ): Promise<OrgaoIntelligenceResponse> {
    const agora = new Date();
    const inicio30d = new Date(agora);
    inicio30d.setDate(inicio30d.getDate() - 30);
    const inicio60d = new Date(agora);
    inicio60d.setDate(inicio60d.getDate() - 60);

    // ── Busca os órgãos mais ativos com agregações ──────────────────────────
    const [orgaosAtivos, topModalidades, tendenciaMensal, resumo] =
      await Promise.all([
        this.buscarOrgaosAtivos(uf, limite, inicio30d, inicio60d),
        this.buscarDistribuicaoModalidades(uf, inicio30d),
        this.buscarTendenciaMensal(uf),
        this.buscarResumoMercado(agora),
      ]);

    return {
      radar: orgaosAtivos,
      topModalidades,
      tendenciaMensal,
      resumo,
    };
  }

  // ── 2. Ranking de Oportunidades (Raio-X) ─────────────────────────────────
  async getRankingOportunidades(
    uf?: string,
    modalidadeId?: number,
    pagina = 1,
    limite = 20,
  ): Promise<{ items: OportunidadeRanking[]; total: number }> {
    const agora = new Date();
    const em7dias = new Date(agora);
    em7dias.setDate(em7dias.getDate() + 7);
    const em30dias = new Date(agora);
    em30dias.setDate(em30dias.getDate() + 30);

    const where: any = {
      situacao: 'DIVULGADA',
      dataEncerramentoProposta: { gte: agora, lte: em30dias },
      OR: [
        { valorTotalEstimado: { gt: 0 } },
        { valorTotalEstimado: null },
      ],
    };

    if (uf) where.unidadeUfSigla = uf;
    if (modalidadeId) where.modalidadeId = modalidadeId;

    const [items, total] = await Promise.all([
      this.prisma.pncpContratacao.findMany({
        where,
        select: {
          id: true,
          numeroControlePncp: true,
          objetoCompra: true,
          orgaoRazaoSocial: true,
          orgaoCnpj: true,
          unidadeUfSigla: true,
          modalidadeNome: true,
          valorTotalEstimado: true,
          dataEncerramentoProposta: true,
          dataPublicacaoPncp: true,
        },
        orderBy: [
          { dataEncerramentoProposta: 'asc' },
          { valorTotalEstimado: 'desc' },
        ],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.pncpContratacao.count({ where }),
    ]);

    const rankings: OportunidadeRanking[] = items.map((item) => {
      const diasRestantes = item.dataEncerramentoProposta
        ? Math.ceil(
            (item.dataEncerramentoProposta.getTime() - agora.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      const { score, motivos } = this.calcularScoreOportunidade({
        diasRestantes,
        valor: Number(item.valorTotalEstimado ?? 0),
        dataPublicacao: item.dataPublicacaoPncp,
      });

      return {
        id: item.id,
        numeroControlePncp: item.numeroControlePncp,
        objetoCompra: item.objetoCompra ?? '',
        orgaoRazaoSocial: item.orgaoRazaoSocial,
        orgaoCnpj: item.orgaoCnpj,
        uf: item.unidadeUfSigla,
        modalidadeNome: item.modalidadeNome,
        valorTotalEstimado: Number(item.valorTotalEstimado ?? 0),
        dataEncerramentoProposta: item.dataEncerramentoProposta,
        dataPublicacaoPncp: item.dataPublicacaoPncp,
        diasRestantes,
        scoreOportunidade: score,
        motivos,
      };
    });

    return { items: rankings, total };
  }

  // ── 3. Análise Temporal de um Órgão específico ───────────────────────────
  async getOrgaoAnalise(cnpj: string): Promise<{
    orgao: any;
    historico: TendenciaTemporalItem[];
    modalidades: ModalidadeDistribuicao[];
    top5Objetos: { objeto: string; total: number; valorMedio: number }[];
    scoreOportunidade: number;
  }> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    const [orgao, historico, modalidades, top5Objetos] = await Promise.all([
      this.prisma.pncpOrgao.findUnique({ where: { cnpj: cnpjLimpo } }),

      // Histórico de 12 meses
      this.prisma.$queryRaw<{ mes: string; total: bigint; valor: string }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "dataPublicacaoPncp"), 'YYYY-MM') AS mes,
          COUNT(*)::bigint AS total,
          COALESCE(SUM("valorTotalEstimado"), 0)::text AS valor
        FROM "PncpContratacao"
        WHERE "orgaoCnpj" = ${cnpjLimpo}
          AND "dataPublicacaoPncp" >= NOW() - INTERVAL '12 months'
        GROUP BY 1
        ORDER BY 1
      `,

      // Distribuição de modalidades do órgão
      this.prisma.$queryRaw<{ modalidade: string; total: bigint; valor: string }[]>`
        SELECT
          COALESCE("modalidadeNome", 'Não informado') AS modalidade,
          COUNT(*)::bigint AS total,
          COALESCE(SUM("valorTotalEstimado"), 0)::text AS valor
        FROM "PncpContratacao"
        WHERE "orgaoCnpj" = ${cnpjLimpo}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 6
      `,

      // Top 5 objetos mais frequentes
      this.prisma.$queryRaw<{ objeto: string; total: bigint; valor_medio: string }[]>`
        SELECT
          LEFT("objetoCompra", 80) AS objeto,
          COUNT(*)::bigint AS total,
          AVG("valorTotalEstimado")::text AS valor_medio
        FROM "PncpContratacao"
        WHERE "orgaoCnpj" = ${cnpjLimpo}
          AND "objetoCompra" IS NOT NULL
        GROUP BY LEFT("objetoCompra", 80)
        ORDER BY total DESC
        LIMIT 5
      `,
    ]);

    const historicoFormatado: TendenciaTemporalItem[] = historico.map((h) => ({
      mes: h.mes,
      total: Number(h.total),
      valor: parseFloat(h.valor),
    }));

    const modalidadesFormatadas: ModalidadeDistribuicao[] = modalidades.map((m) => ({
      modalidade: m.modalidade,
      total: Number(m.total),
      valorTotal: parseFloat(m.valor),
    }));

    const top5 = top5Objetos.map((o) => ({
      objeto: o.objeto,
      total: Number(o.total),
      valorMedio: parseFloat(o.valor_medio ?? '0'),
    }));

    // Score baseado no histórico do órgão
    const totalLicitacoes = historicoFormatado.reduce((a, b) => a + b.total, 0);
    const scoreFinal = Math.min(100, Math.round((totalLicitacoes / 10) * 5 + 50));

    return {
      orgao,
      historico: historicoFormatado,
      modalidades: modalidadesFormatadas,
      top5Objetos: top5,
      scoreOportunidade: scoreFinal,
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async buscarOrgaosAtivos(
    uf: string | undefined,
    limite: number,
    inicio30d: Date,
    inicio60d: Date,
  ): Promise<OrgaoRadarItem[]> {
    const ufFilter = uf ? `AND c."unidadeUfSigla" = '${uf}'` : '';

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        c."orgaoCnpj"                                                    AS cnpj,
        MAX(c."orgaoRazaoSocial")                                        AS "razaoSocial",
        MAX(c."unidadeUfSigla")                                          AS uf,
        MAX(c."unidadeMunicipioNome")                                    AS municipio,
        COUNT(*)::bigint                                                  AS "totalLicitacoes",
        COALESCE(SUM(c."valorTotalEstimado"), 0)                         AS "valorTotalEstimado",
        COUNT(*) FILTER (WHERE c."dataPublicacaoPncp" >= ${inicio30d})::bigint AS "licitacoes30d",
        COUNT(*) FILTER (WHERE c."dataPublicacaoPncp" >= ${inicio60d}
                          AND  c."dataPublicacaoPncp" < ${inicio30d})::bigint AS "licitacoesPrev30d",
        MAX(c."dataPublicacaoPncp")                                      AS "dataUltimaLicitacao",
        MODE() WITHIN GROUP (ORDER BY c."modalidadeNome")                AS "modalidadeTop"
      FROM "PncpContratacao" c
      WHERE c."orgaoCnpj" IS NOT NULL
        ${uf ? `AND c."unidadeUfSigla" = ${uf}` : ''}
        AND c."dataPublicacaoPncp" >= NOW() - INTERVAL '365 days'
      GROUP BY c."orgaoCnpj"
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC
      LIMIT ${limite}
    `;

    // Busca total de contratos por órgão em paralelo  
    const cnpjs = rows.map((r) => r.cnpj);
    const contratos = cnpjs.length
      ? await this.prisma.pncpContrato.groupBy({
          by: ['orgaoCnpj'],
          where: { orgaoCnpj: { in: cnpjs } },
          _count: { id: true },
          _sum: { valorGlobal: true },
        })
      : [];

    const contratoMap = new Map(
      contratos.map((c) => [c.orgaoCnpj, { count: c._count.id, valor: Number(c._sum.valorGlobal ?? 0) }]),
    );

    return rows.map((r): OrgaoRadarItem => {
      const totalLic = Number(r.totalLicitacoes);
      const l30 = Number(r.licitacoes30d);
      const lPrev = Number(r.licitacoesPrev30d);
      const contrato = contratoMap.get(r.cnpj) ?? { count: 0, valor: 0 };
      const valor = Number(r.valorTotalEstimado);

      let tendencia: 'ALTA' | 'ESTAVEL' | 'QUEDA' = 'ESTAVEL';
      if (l30 > lPrev * 1.2) tendencia = 'ALTA';
      else if (l30 < lPrev * 0.7) tendencia = 'QUEDA';

      // Score: 0-100 baseado em atividade e valores
      const scoreAtividade = Math.min(50, Math.round((totalLic / 50) * 50));
      const scoreValor = valor > 0 ? Math.min(30, Math.round(Math.log10(valor / 10_000) * 10)) : 0;
      const scoreTendencia = tendencia === 'ALTA' ? 20 : tendencia === 'ESTAVEL' ? 10 : 0;
      const scoreOportunidade = Math.max(0, Math.min(100, scoreAtividade + scoreValor + scoreTendencia));

      return {
        cnpj: r.cnpj,
        razaoSocial: r.razaoSocial ?? r.cnpj,
        uf: r.uf,
        municipio: r.municipio,
        totalLicitacoes: totalLic,
        totalContratos: contrato.count,
        totalAtas: 0,
        valorTotalEstimadoLicitacoes: valor,
        valorTotalContratos: contrato.valor,
        valorMedioLicitacao: totalLic > 0 ? valor / totalLic : 0,
        licitacoesUltimos30d: l30,
        licitacoesPeriodoAnterior: lPrev,
        tendencia,
        modalidadeTop: r.modalidadeTop,
        dataUltimaLicitacao: r.dataUltimaLicitacao
          ? new Date(r.dataUltimaLicitacao).toISOString().split('T')[0]
          : null,
        dataUltimoContrato: null,
        scoreOportunidade,
      };
    });
  }

  private async buscarDistribuicaoModalidades(
    uf: string | undefined,
    desde: Date,
  ): Promise<ModalidadeDistribuicao[]> {
    const rows = await this.prisma.pncpContratacao.groupBy({
      by: ['modalidadeNome'],
      where: {
        dataPublicacaoPncp: { gte: desde },
        ...(uf ? { unidadeUfSigla: uf } : {}),
      },
      _count: { id: true },
      _sum: { valorTotalEstimado: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    return rows.map((r) => ({
      modalidade: r.modalidadeNome ?? 'Não informado',
      total: r._count.id,
      valorTotal: Number(r._sum.valorTotalEstimado ?? 0),
    }));
  }

  private async buscarTendenciaMensal(uf?: string): Promise<TendenciaTemporalItem[]> {
    const rows = await this.prisma.$queryRaw<{ mes: string; total: bigint; valor: string }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "dataPublicacaoPncp"), 'YYYY-MM') AS mes,
        COUNT(*)::bigint AS total,
        COALESCE(SUM("valorTotalEstimado"), 0)::text AS valor
      FROM "PncpContratacao"
      WHERE "dataPublicacaoPncp" >= NOW() - INTERVAL '12 months'
        ${uf ? `AND "unidadeUfSigla" = '${uf}'` : ''}
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((r) => ({
      mes: r.mes,
      total: Number(r.total),
      valor: parseFloat(r.valor),
    }));
  }

  private async buscarResumoMercado(agora: Date): Promise<{
    totalOrgaosAtivos: number;
    valorTotalMercado: number;
    licitacoesAbertasHoje: number;
    encerrando7dias: number;
  }> {
    const inicio30d = new Date(agora);
    inicio30d.setDate(inicio30d.getDate() - 30);
    const em7dias = new Date(agora);
    em7dias.setDate(em7dias.getDate() + 7);

    const [orgaosAtivos, valorMercado, abertas, encerrando] = await Promise.all([
      this.prisma.pncpContratacao.findMany({
        where: { dataPublicacaoPncp: { gte: inicio30d } },
        select: { orgaoCnpj: true },
        distinct: ['orgaoCnpj'],
      }),

      this.prisma.pncpContratacao.aggregate({
        where: { dataPublicacaoPncp: { gte: inicio30d } },
        _sum: { valorTotalEstimado: true },
      }),

      this.prisma.pncpContratacao.count({
        where: {
          situacao: 'DIVULGADA',
          dataEncerramentoProposta: { gte: agora },
        },
      }),

      this.prisma.pncpContratacao.count({
        where: {
          situacao: 'DIVULGADA',
          dataEncerramentoProposta: { gte: agora, lte: em7dias },
        },
      }),
    ]);

    return {
      totalOrgaosAtivos: orgaosAtivos.length,
      valorTotalMercado: Number(valorMercado._sum.valorTotalEstimado ?? 0),
      licitacoesAbertasHoje: abertas,
      encerrando7dias: encerrando,
    };
  }

  private calcularScoreOportunidade(params: {
    diasRestantes: number;
    valor: number;
    dataPublicacao: Date | null;
  }): { score: number; motivos: string[] } {
    let score = 50;
    const motivos: string[] = [];

    // Janela de tempo ideal: 5-15 dias
    if (params.diasRestantes >= 5 && params.diasRestantes <= 15) {
      score += 20;
      motivos.push('Janela de proposta ideal');
    } else if (params.diasRestantes > 15 && params.diasRestantes <= 30) {
      score += 10;
      motivos.push('Tempo suficiente para proposta');
    } else if (params.diasRestantes < 5) {
      score -= 20;
      motivos.push('Prazo curto');
    }

    // Valor
    if (params.valor >= 1_000_000) {
      score += 15;
      motivos.push('Alto valor estimado');
    } else if (params.valor >= 100_000) {
      score += 5;
      motivos.push('Valor relevante');
    }

    // Publicação recente (melhora visibilidade)
    if (params.dataPublicacao) {
      const diasPublicado = Math.floor(
        (Date.now() - params.dataPublicacao.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diasPublicado <= 3) {
        score += 15;
        motivos.push('Publicação recente');
      }
    }

    return { score: Math.max(0, Math.min(100, score)), motivos };
  }
}
