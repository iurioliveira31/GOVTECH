import { register } from './metrics';
import * as http from 'http';

const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9090);

/**
 * Inicia servidor HTTP mínimo para expor métricas Prometheus em /metrics.
 * Separado do worker principal para não interferir em graceful shutdown.
 */
export async function startMetricsServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url === '/metrics' && req.method === 'GET') {
        try {
          const metrics = await register.metrics();
          res.writeHead(200, { 'Content-Type': register.contentType });
          res.end(metrics);
        } catch (err) {
          res.writeHead(500);
          res.end('Erro ao coletar métricas');
        }
      } else if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(METRICS_PORT, () => {
      resolve();
    });
  });
}
