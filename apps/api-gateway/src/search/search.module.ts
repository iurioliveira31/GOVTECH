import { Module, OnModuleInit } from '@nestjs/common';
import { ElasticsearchClientService, SearchService } from '@aplicativo/search';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers:   [ElasticsearchClientService, SearchService],
  exports:     [SearchService],
})
export class SearchModule implements OnModuleInit {
  constructor(private readonly searchService: SearchService) {}

  async onModuleInit() {
    // Cria índices na inicialização, ignora se ES offline
    try {
      await this.searchService.setupIndices();
    } catch {
      // Elasticsearch pode não estar disponível em dev
    }
  }
}
