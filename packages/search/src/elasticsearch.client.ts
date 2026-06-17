import { Client } from '@elastic/elasticsearch';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchClientService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchClientService.name);
  readonly client: Client;

  constructor(private readonly config: ConfigService) {
    const node = this.config.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200');
    const username = this.config.get<string>('ELASTICSEARCH_USERNAME', 'elastic');
    const password = this.config.get<string>('ELASTICSEARCH_PASSWORD', '');

    this.client = new Client({
      node,
      auth: password ? { username, password } : undefined,
      tls: { rejectUnauthorized: false }, // dev only — forçar em produção
      requestTimeout: 10_000,
    });
  }

  async onModuleInit() {
    try {
      const info = await this.client.info();
      this.logger.log(`Elasticsearch conectado — versão ${info.version.number}`);
    } catch (err) {
      this.logger.warn(`Elasticsearch indisponível: ${(err as Error).message}. Search degradado.`);
    }
  }

  /**
   * Verifica se o Elasticsearch está acessível.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
