import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PncpSyncService } from './src/pncp/pncp-sync.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncSvc = app.get(PncpSyncService);
  const res1 = await syncSvc.triggerContratacoes({ dataInicial: '2026-05-01', dataFinal: '2026-07-01' });
  console.log(res1);
  const res2 = await syncSvc.triggerAtas({ dataInicial: '2026-05-01', dataFinal: '2026-07-01' });
  console.log(res2);
  console.log('Jobs enfileirados!');
  await app.close();
}
bootstrap();
