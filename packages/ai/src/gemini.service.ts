import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import {
  SYSTEM_GOVTECH,
  promptAnalisarContrato,
  promptResumirLicitacao,
  promptAnalisarFornecedor,
} from './prompts/govtech.prompts';

// ── Tipos de retorno ─────────────────────────────────────────────────────────

export interface AnaliseContrato {
  resumo: string;
  pontosAtencao: string[];
  scoreConformidade: number;
  scoreRisco: number;
  recomendacoes: string[];
  fundamentoLegal: string[];
  classificacao: 'BAIXO_RISCO' | 'MEDIO_RISCO' | 'ALTO_RISCO' | 'CRITICO';
}

export interface ResumoLicitacao {
  resumoExecutivo: string;
  oportunidades: string[];
  requisitosProvaveis: string[];
  prazoAnalise: string;
  classificacaoObjeto: string;
  complexidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  tags: string[];
}

export interface AnaliseFornecedor {
  perfilFornecedor: string;
  indicadoresPositivos: string[];
  indicadoresNegativos: string[];
  scoreConcentracao: number;
  recomendacao: 'APTO' | 'VERIFICAR' | 'ALTO_RISCO';
  observacoes: string;
}

export type AnaliseTipo = 'CONTRATO' | 'LICITACAO' | 'FORNECEDOR';

// ── Safety settings — permissivos para contexto GovTech ─────────────────────

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: GenerativeModel | null = null;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.enabled = !!apiKey;

    if (apiKey) {
      const genai = new GoogleGenerativeAI(apiKey);
      this.model = genai.getGenerativeModel({
        model:          'gemini-1.5-flash',
        systemInstruction: SYSTEM_GOVTECH,
        safetySettings: SAFETY,
        generationConfig: {
          temperature:     0.3,    // baixo para análise factual
          topP:            0.85,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });
      this.logger.log('Gemini AI inicializado (gemini-1.5-flash)');
    } else {
      this.logger.warn('GEMINI_API_KEY não configurado — AI desabilitado');
    }
  }

  // ── Análise de contrato ───────────────────────────────────────────────────

  async analisarContrato(dados: Parameters<typeof promptAnalisarContrato>[0]): Promise<AnaliseContrato> {
    return this.invoke<AnaliseContrato>(promptAnalisarContrato(dados));
  }

  // ── Resumo de licitação ───────────────────────────────────────────────────

  async resumirLicitacao(dados: Parameters<typeof promptResumirLicitacao>[0]): Promise<ResumoLicitacao> {
    return this.invoke<ResumoLicitacao>(promptResumirLicitacao(dados));
  }

  // ── Análise de fornecedor ─────────────────────────────────────────────────

  async analisarFornecedor(dados: Parameters<typeof promptAnalisarFornecedor>[0]): Promise<AnaliseFornecedor> {
    return this.invoke<AnaliseFornecedor>(promptAnalisarFornecedor(dados));
  }

  // ── Engine interno ────────────────────────────────────────────────────────

  private async invoke<T>(prompt: string): Promise<T> {
    if (!this.model) {
      throw new ServiceUnavailableException(
        'AI não disponível. Configure GEMINI_API_KEY para habilitar esta funcionalidade.',
      );
    }

    try {
      const result = await this.model.generateContent(prompt);
      const text   = result.response.text();

      // Remover possíveis blocos markdown ``` que o modelo pode inserir
      const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();

      return JSON.parse(clean) as T;
    } catch (err) {
      this.logger.error({ err }, 'Erro ao invocar Gemini');
      throw err;
    }
  }

  /**
   * Verifica se o serviço AI está configurado e disponível.
   */
  isAvailable(): boolean {
    return this.enabled;
  }
}
