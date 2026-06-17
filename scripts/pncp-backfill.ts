/**
 * Script de backfill histórico do PNCP
 *
 * Uso:
 *   npx ts-node scripts/pncp-backfill.ts --inicio 2024-01-01 --fim 2024-12-31
 *   npx ts-node scripts/pncp-backfill.ts --inicio 2024-01-01             # até ontem
 *   npx ts-node scripts/pncp-backfill.ts --ano 2024                      # ano completo
 *   PNCP_SYNC_DETALHES=true npx ts-node scripts/pncp-backfill.ts --ano 2025
 */

import { PrismaClient } from '@prisma/client';
import { SyncOrchestrator } from '../packages/sync/src/orchestrator';

// Parsing de argumentos
const args = process.argv.slice(2);
const get = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};

async function main() {
  const prisma = new PrismaClient();
  const orchestrator = new SyncOrchestrator(prisma);

  let dataInicial: Date;
  let dataFinal: Date;

  const ano = get('--ano');
  const inicio = get('--inicio');
  const fim = get('--fim');

  if (ano) {
    dataInicial = new Date(Number(ano), 0, 1);
    dataFinal = new Date(Number(ano), 11, 31);
  } else if (inicio) {
    dataInicial = new Date(inicio);
    dataFinal = fim ? new Date(fim) : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
  } else {
    // Default: últimos 90 dias
    dataFinal = new Date();
    dataFinal.setDate(dataFinal.getDate() - 1);
    dataInicial = new Date(dataFinal);
    dataInicial.setDate(dataInicial.getDate() - 90);
  }

  const syncDetalhes = process.env.PNCP_SYNC_DETALHES === 'true';

  console.log(`\n🚀 PNCP Backfill iniciado`);
  console.log(`   Período:  ${dataInicial.toISOString().split('T')[0]} → ${dataFinal.toISOString().split('T')[0]}`);
  console.log(`   Detalhes: ${syncDetalhes ? 'SIM (itens + documentos)' : 'NÃO (apenas cabeçalhos)'}`);
  console.log(`   Nota: janelas diárias × 13 modalidades\n`);

  const t0 = Date.now();

  try {
    // Contratações
    console.log('📋 Sincronizando contratações...');
    const statsContratacoes = await orchestrator.syncContratacoes(dataInicial, dataFinal, {
      windowDays: 1,
      syncDetalhes,
    });
    printStats('Contratações', statsContratacoes);

    // Contratos
    console.log('\n📄 Sincronizando contratos...');
    const statsContratos = await orchestrator.syncContratos(dataInicial, dataFinal, {
      windowDays: 1,
    });
    printStats('Contratos', statsContratos);

    // Atas
    console.log('\n📑 Sincronizando atas de registro de preços...');
    const statsAtas = await orchestrator.syncAtas(dataInicial, dataFinal, {
      windowDays: 7,
    });
    printStats('Atas', statsAtas);

    // PCA — anos dentro do intervalo
    const anos = new Set<number>();
    for (let y = dataInicial.getFullYear(); y <= dataFinal.getFullYear(); y++) {
      anos.add(y);
    }

    for (const anoPca of anos) {
      console.log(`\n📊 Sincronizando PCA ${anoPca}...`);
      const statsPca = await orchestrator.syncPca(anoPca);
      printStats(`PCA ${anoPca}`, statsPca);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✅ Backfill concluído em ${elapsed}s`);
  } catch (err: any) {
    console.error('\n❌ Erro no backfill:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printStats(label: string, stats: any) {
  console.log(
    `   ✔ ${label}: ` +
    `${stats.registrosInseridos} inseridos, ` +
    `${stats.registrosAtualizados} atualizados, ` +
    `${stats.registrosDuplicados} duplicados, ` +
    `${stats.erros} erros`,
  );
}

main();
