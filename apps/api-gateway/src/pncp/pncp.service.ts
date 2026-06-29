import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  FiltroContratacaoDto,
  FiltroContratoDto,
  FiltroAtaDto,
  FiltroPcaDto,
  FiltroOrgaoDto,
  FiltroFornecedorDto,
} from './dto/pncp-query.dto';

function paginacao(pagina = 1, limite = 20) {
  return { skip: (pagina - 1) * limite, take: limite };
}

function parseSortField(ordem: string | undefined, fallback: any): Record<string, 'asc' | 'desc'> {
  if (!ordem) return fallback;
  const idx = ordem.lastIndexOf('_');
  if (idx === -1) return fallback;
  const field = ordem.substring(0, idx);
  const dir = ordem.substring(idx + 1) as 'asc' | 'desc';
  return { [field]: dir };
}

@Injectable()
export class PncpService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────
  // Contratações
  // ──────────────────────────────────────────────────────────────

  async listarContratacoes(filtro: FiltroContratacaoDto) {
    const { pagina = 1, limite = 20, ordem, ...rest } = filtro;
    const { skip, take } = paginacao(pagina, limite);

    const where: Prisma.PncpContratacaoWhereInput = {};

    if (rest.q) {
      where.objetoCompra = { contains: rest.q, mode: 'insensitive' };
    }
    if (rest.uf) {
      where.unidadeUfSigla = { equals: rest.uf.toUpperCase() };
    }
    if (rest.orgaoCnpj) {
      where.orgaoCnpj = rest.orgaoCnpj.replace(/\D/g, '');
    }
    if (rest.modalidadeId !== undefined) {
      where.modalidadeId = rest.modalidadeId;
    }
    if (rest.situacao) {
      where.situacao = rest.situacao as any;
    }
    if (rest.srp !== undefined) {
      where.srp = rest.srp;
    }
    if (rest.abertas) {
      where.dataEncerramentoProposta = { gte: new Date() };
      where.situacao = 'DIVULGADA';
    }
    if (rest.dataPublicacaoInicio || rest.dataPublicacaoFim) {
      where.dataPublicacaoPncp = {
        ...(rest.dataPublicacaoInicio && { gte: new Date(rest.dataPublicacaoInicio) }),
        ...(rest.dataPublicacaoFim && { lte: new Date(rest.dataPublicacaoFim) }),
      };
    }
    if (rest.dataEncerramentoInicio || rest.dataEncerramentoFim) {
      where.dataEncerramentoProposta = {
        ...(rest.dataEncerramentoInicio && { gte: new Date(rest.dataEncerramentoInicio) }),
        ...(rest.dataEncerramentoFim && { lte: new Date(rest.dataEncerramentoFim) }),
      };
    }
    if (rest.valorMinimo !== undefined || rest.valorMaximo !== undefined) {
      where.valorTotalEstimado = {
        ...(rest.valorMinimo !== undefined && { gte: rest.valorMinimo }),
        ...(rest.valorMaximo !== undefined && { lte: rest.valorMaximo }),
      };
    }

    const orderBy = parseSortField(ordem, { dataPublicacaoPncp: 'desc' });

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpContratacao.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          numeroControlePncp: true,
          modalidadeNome: true,
          modalidade: true,
          situacao: true,
          situacaoNome: true,
          objetoCompra: true,
          valorTotalEstimado: true,
          valorTotalHomologado: true,
          dataAberturaProposta: true,
          dataEncerramentoProposta: true,
          dataPublicacaoPncp: true,
          srp: true,
          orcamentoSigiloso: true,
          orgaoCnpj: true,
          orgaoRazaoSocial: true,
          unidadeNome: true,
          unidadeUfSigla: true,
          unidadeMunicipioNome: true,
          amparoLegalNome: true,
          linkSistemaOrigem: true,
          dataAtualizacao: true,
          _count: { select: { itens: true, documentos: true } },
        },
      }),
      this.prisma.pncpContratacao.count({ where }),
    ]);

    return {
      data,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  async detalharContratacao(id: string) {
    const contratacao = await this.prisma.pncpContratacao.findUnique({
      where: { id },
      include: {
        itens: {
          orderBy: { numeroItem: 'asc' },
          include: { resultados: { orderBy: { sequencialResultado: 'asc' } } },
        },
        documentos: { orderBy: { sequencialDocumento: 'asc' } },
        atas: {
          select: {
            id: true,
            numeroControlePncpAta: true,
            vigenciaInicio: true,
            vigenciaFim: true,
            cancelado: true,
          },
        },
      },
    });

    if (!contratacao) throw new NotFoundException('Contratação não encontrada');
    return contratacao;
  }

  async detalharContratacaoPorNumeroControle(numeroControlePncp: string) {
    const contratacao = await this.prisma.pncpContratacao.findUnique({
      where: { numeroControlePncp },
      include: {
        itens: {
          orderBy: { numeroItem: 'asc' },
          include: { resultados: true },
        },
        documentos: { orderBy: { sequencialDocumento: 'asc' } },
      },
    });

    if (!contratacao) throw new NotFoundException('Contratação não encontrada');
    return contratacao;
  }

  async listarItensContratacao(contratacaoId: string) {
    const contratacao = await this.prisma.pncpContratacao.findUnique({
      where: { id: contratacaoId },
      select: { id: true },
    });
    if (!contratacao) throw new NotFoundException('Contratação não encontrada');

    return this.prisma.pncpItemContratacao.findMany({
      where: { contratacaoId },
      orderBy: { numeroItem: 'asc' },
      include: { resultados: { orderBy: { sequencialResultado: 'asc' } } },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Contratos
  // ──────────────────────────────────────────────────────────────

  async listarContratos(filtro: FiltroContratoDto) {
    const { pagina = 1, limite = 20, ordem, ...rest } = filtro;
    const { skip, take } = paginacao(pagina, limite);

    const where: Prisma.PncpContratoWhereInput = {};
    const hoje = new Date();

    if (rest.q) {
      where.OR = [
        { objetoContrato: { contains: rest.q, mode: 'insensitive' } },
        { nomeRazaoSocialFornecedor: { contains: rest.q, mode: 'insensitive' } },
      ];
    }
    if (rest.uf) {
      where.unidadeUfSigla = { equals: rest.uf.toUpperCase() };
    }
    if (rest.orgaoCnpj) {
      where.orgaoCnpj = rest.orgaoCnpj.replace(/\D/g, '');
    }
    if (rest.niFornecedor) {
      where.niFornecedor = rest.niFornecedor.replace(/\D/g, '');
    }
    if (rest.tipoContrato) {
      where.tipoContrato = rest.tipoContrato as any;
    }
    if (rest.vigentes) {
      where.dataVigenciaFim = { gte: hoje };
    }
    if (rest.vencendoEm30Dias) {
      const em30 = new Date(hoje);
      em30.setDate(em30.getDate() + 30);
      where.dataVigenciaFim = { gte: hoje, lte: em30 };
    }
    if (rest.dataPublicacaoInicio || rest.dataPublicacaoFim) {
      where.dataPublicacaoPncp = {
        ...(rest.dataPublicacaoInicio && { gte: new Date(rest.dataPublicacaoInicio) }),
        ...(rest.dataPublicacaoFim && { lte: new Date(rest.dataPublicacaoFim) }),
      };
    }
    if (rest.dataVigenciaFimInicio || rest.dataVigenciaFimFim) {
      where.dataVigenciaFim = {
        ...(rest.dataVigenciaFimInicio && { gte: new Date(rest.dataVigenciaFimInicio) }),
        ...(rest.dataVigenciaFimFim && { lte: new Date(rest.dataVigenciaFimFim) }),
      };
    }
    if (rest.valorMinimo !== undefined || rest.valorMaximo !== undefined) {
      where.valorGlobal = {
        ...(rest.valorMinimo !== undefined && { gte: rest.valorMinimo }),
        ...(rest.valorMaximo !== undefined && { lte: rest.valorMaximo }),
      };
    }

    const orderBy = parseSortField(ordem, { dataPublicacaoPncp: 'desc' });

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpContrato.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          numeroControlePncp: true,
          numeroContratoEmpenho: true,
          anoContrato: true,
          tipoContratoNome: true,
          tipoContrato: true,
          objetoContrato: true,
          niFornecedor: true,
          nomeRazaoSocialFornecedor: true,
          valorInicial: true,
          valorGlobal: true,
          valorAcumulado: true,
          dataAssinatura: true,
          dataVigenciaInicio: true,
          dataVigenciaFim: true,
          dataPublicacaoPncp: true,
          numeroRetificacao: true,
          orgaoCnpj: true,
          orgaoRazaoSocial: true,
          unidadeUfSigla: true,
          unidadeMunicipioNome: true,
          dataAtualizacao: true,
          _count: { select: { documentos: true } },
        },
      }),
      this.prisma.pncpContrato.count({ where }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async detalharContrato(id: string) {
    const contrato = await this.prisma.pncpContrato.findUnique({
      where: { id },
      include: {
        documentos: { orderBy: { sequencialDocumento: 'asc' } },
        fornecedor: true,
      },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');
    return contrato;
  }

  // ──────────────────────────────────────────────────────────────
  // Atas de Registro de Preços
  // ──────────────────────────────────────────────────────────────

  async listarAtas(filtro: FiltroAtaDto) {
    const { pagina = 1, limite = 20, ...rest } = filtro;
    const { skip, take } = paginacao(pagina, limite);
    const hoje = new Date();

    const where: Prisma.PncpAtaWhereInput = {};

    if (rest.q) {
      where.objetoContratacao = { contains: rest.q, mode: 'insensitive' };
    }
    if (rest.orgaoCnpj) {
      where.cnpjOrgao = rest.orgaoCnpj.replace(/\D/g, '');
    }
    if (rest.vigentes) {
      where.vigenciaFim = { gte: hoje };
      where.cancelado = false;
    }
    if (rest.canceladas !== undefined) {
      where.cancelado = rest.canceladas;
    }
    if (rest.vigenciaFimInicio || rest.vigenciaFimFim) {
      where.vigenciaFim = {
        ...(rest.vigenciaFimInicio && { gte: new Date(rest.vigenciaFimInicio) }),
        ...(rest.vigenciaFimFim && { lte: new Date(rest.vigenciaFimFim) }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpAta.findMany({
        where,
        orderBy: { dataPublicacaoPncp: 'desc' },
        skip,
        take,
        include: {
          documentos: { select: { id: true, titulo: true, url: true } },
        },
      }),
      this.prisma.pncpAta.count({ where }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async detalharAta(id: string) {
    const ata = await this.prisma.pncpAta.findUnique({
      where: { id },
      include: { documentos: true },
    });
    if (!ata) throw new NotFoundException('Ata não encontrada');
    return ata;
  }

  // ──────────────────────────────────────────────────────────────
  // PCA
  // ──────────────────────────────────────────────────────────────

  async listarPcas(filtro: FiltroPcaDto) {
    const { pagina = 1, limite = 20, ...rest } = filtro;
    const { skip, take } = paginacao(pagina, limite);

    const where: Prisma.PncpPcaWhereInput = {};

    if (rest.orgaoCnpj) {
      where.cnpjOrgao = rest.orgaoCnpj.replace(/\D/g, '');
    }
    if (rest.ano) {
      where.anoPca = rest.ano;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpPca.findMany({
        where,
        orderBy: { anoPca: 'desc' },
        skip,
        take,
        include: { _count: { select: { itens: true } } },
      }),
      this.prisma.pncpPca.count({ where }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async detalharPca(id: string) {
    const pca = await this.prisma.pncpPca.findUnique({
      where: { id },
      include: { itens: { orderBy: { numeroItem: 'asc' } } },
    });
    if (!pca) throw new NotFoundException('PCA não encontrado');
    return pca;
  }

  async listarItensPca(pcaId: string, pagina = 1, limite = 50) {
    const { skip, take } = paginacao(pagina, limite);
    const pca = await this.prisma.pncpPca.findUnique({ where: { id: pcaId }, select: { id: true } });
    if (!pca) throw new NotFoundException('PCA não encontrado');

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpItemPca.findMany({
        where: { pcaId },
        orderBy: { numeroItem: 'asc' },
        skip,
        take,
      }),
      this.prisma.pncpItemPca.count({ where: { pcaId } }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Órgãos compradores
  // ──────────────────────────────────────────────────────────────

  async listarOrgaos(filtro: FiltroOrgaoDto) {
    const { pagina = 1, limite = 20, q, uf, esfera } = filtro;
    const { skip, take } = paginacao(pagina, limite);

    const where: Prisma.PncpOrgaoWhereInput = {};

    if (q) {
      where.razaoSocial = { contains: q, mode: 'insensitive' };
    }
    if (uf) {
      where.ufSigla = uf.toUpperCase();
    }
    if (esfera) {
      where.esferaId = esfera.toUpperCase() as any;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpOrgao.findMany({
        where,
        orderBy: { razaoSocial: 'asc' },
        skip,
        take,
        include: {
          _count: {
            select: { contratacoes: true, contratos: true },
          },
        },
      }),
      this.prisma.pncpOrgao.count({ where }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async detalharOrgao(cnpj: string) {
    const cnpjClean = cnpj.replace(/\D/g, '');
    const orgao = await this.prisma.pncpOrgao.findUnique({
      where: { cnpj: cnpjClean },
      include: {
        _count: {
          select: { contratacoes: true, contratos: true, atas: true, pcas: true },
        },
      },
    });
    if (!orgao) throw new NotFoundException('Órgão não encontrado');
    return orgao;
  }

  // ──────────────────────────────────────────────────────────────
  // Fornecedores
  // ──────────────────────────────────────────────────────────────

  async listarFornecedores(filtro: FiltroFornecedorDto) {
    const { pagina = 1, limite = 20, q, tipoPessoa } = filtro;
    const { skip, take } = paginacao(pagina, limite);

    const where: Prisma.PncpFornecedorWhereInput = {};

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { ni: { contains: q } },
      ];
    }
    if (tipoPessoa) {
      where.tipoPessoa = tipoPessoa.toUpperCase();
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pncpFornecedor.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip,
        take,
        include: { _count: { select: { contratos: true, resultados: true } } },
      }),
      this.prisma.pncpFornecedor.count({ where }),
    ]);

    return {
      data,
      total, pagina, limite, totalPaginas: Math.ceil(total / limite),
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
    };
  }

  async detalharFornecedor(ni: string) {
    const niClean = ni.replace(/\D/g, '') || ni;
    const fornecedor = await this.prisma.pncpFornecedor.findUnique({
      where: { ni: niClean },
      include: {
        contratos: {
          orderBy: { dataPublicacaoPncp: 'desc' },
          take: 10,
          select: {
            id: true,
            numeroControlePncp: true,
            objetoContrato: true,
            valorGlobal: true,
            dataVigenciaFim: true,
            orgaoRazaoSocial: true,
          },
        },
        _count: { select: { contratos: true, resultados: true } },
      },
    });
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado');
    return fornecedor;
  }

  // ──────────────────────────────────────────────────────────────
  // Estado de sincronização
  // ──────────────────────────────────────────────────────────────

  async statusSync() {
    const [cursors, ultimosSyncs, statsGerais] = await this.prisma.$transaction([
      this.prisma.pncpSyncCursor.findMany(),
      this.prisma.pncpSyncState.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          entityType: true,
          syncKey: true,
          status: true,
          totalRegistros: true,
          registrosInseridos: true,
          registrosAtualizados: true,
          erros: true,
          iniciadoEm: true,
          concluidoEm: true,
          ultimoErro: true,
        },
      }),
      this.prisma.pncpSyncState.groupBy({
        by: ['entityType', 'status'],
        _count: true,
        orderBy: [{ entityType: 'asc' }, { status: 'asc' }],
      }),
    ]);

    const totaisPorEntidade = await this.prisma.$transaction([
      this.prisma.pncpContratacao.count(),
      this.prisma.pncpContrato.count(),
      this.prisma.pncpAta.count(),
      this.prisma.pncpPca.count(),
      this.prisma.pncpOrgao.count(),
      this.prisma.pncpFornecedor.count(),
    ]);

    return {
      cursors,
      ultimosSyncs,
      statsGerais,
      totaisNoBanco: {
        contratacoes: totaisPorEntidade[0],
        contratos: totaisPorEntidade[1],
        atas: totaisPorEntidade[2],
        pcas: totaisPorEntidade[3],
        orgaos: totaisPorEntidade[4],
        fornecedores: totaisPorEntidade[5],
      },
    };
  }
}
