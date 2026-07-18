import { GeminiService } from '@aplicativo/ai';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config'; // Mock if not using NestJS here
import axios from 'axios';

const prisma = new PrismaClient();

export class AiResolutionExtractorService {
  private geminiService: GeminiService;

  constructor() {
    const config = new ConfigService();
    this.geminiService = new GeminiService(config);
  }

  async extractItemsFromText(resolutionId: string, pdfText: string) {
    if (!this.geminiService.isAvailable()) {
      console.warn('Gemini AI is not available. Ensure GEMINI_API_KEY is set.');
      return;
    }

    const prompt = `
      Você é um especialista em análise de Diários Oficiais e Resoluções da Secretaria de Saúde de Minas Gerais (SES/MG).
      
      Leia o texto bruto do PDF extraído abaixo e encontre TODOS os repasses de verbas financeiras fundo-a-fundo (do Estado para Municípios, Hospitais, Consórcios ou Fundos Municipais de Saúde).
      
      Retorne APENAS um JSON válido contendo um array de objetos chamado "repasses".
      Cada objeto deve ter a seguinte estrutura:
      - "mesoregiao": string (se mencionado no texto)
      - "microrregiao": string (se mencionado no texto)
      - "municipio": string
      - "local": string (Ex: "FUNDO MUNICIPAL DE SAÚDE DE UNAI", "IRMANDADE NOSSA SENHORA")
      - "item": string (A descrição ou motivo do repasse, ex: "ESTRUTURAÇÃO DA ATENÇÃO PRIMÁRIA")
      - "valor": number (O valor financeiro do repasse convertido para formato numérico, ex: 160000.00)

      Se você não encontrar nenhum repasse, retorne um array vazio. NÃO retorne blocos markdown como \`\`\`json, retorne apenas o JSON.

      Texto da Resolução:
      """
      ${pdfText.substring(0, 30000)} // Limite para não estourar tokens
      """
    `;

    try {
      console.log(`Processando Resolução ${resolutionId} via IA...`);
      // We use the raw model from GeminiService since it has an invoke method, 
      // but it's private. We'll use a hack or just assume there's a raw generation method.
      // Since it's private in gemini.service.ts, we could add a new method there or just re-instantiate.
      
      const response = await (this.geminiService as any).invoke(prompt);
      
      const items = response.repasses || [];
      console.log(`Encontrados ${items.length} repasses na resolução ${resolutionId}.`);

      for (const item of items) {
        await prisma.resolutionItem.create({
          data: {
            resolutionId,
            mesoregiao: item.mesoregiao || null,
            microrregiao: item.microrregiao || null,
            municipio: item.municipio || null,
            local: item.local || null,
            item: item.item || null,
            valor: item.valor || null,
          }
        });
      }

      await prisma.resolution.update({
        where: { id: resolutionId },
        data: { status: 'PROCESSED' }
      });

      // Dispara a avaliação de alertas no API Gateway
      try {
        const API_URL = process.env.API_URL || 'http://localhost:4000';
        await axios.post(`${API_URL}/v1/resolution-alerts/trigger-evaluation`, {
          resolutionId
        });
        console.log(`Avaliação de alertas disparada com sucesso para ${resolutionId}`);
      } catch (alertError: any) {
        console.error(`Erro ao disparar avaliação de alertas para ${resolutionId}:`, alertError.message);
      }

    } catch (error) {
      console.error(`Erro ao processar resolução ${resolutionId}:`, error);
      await prisma.resolution.update({
        where: { id: resolutionId },
        data: { status: 'ERROR' }
      });
    }
  }
}
