import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const prisma = new PrismaClient();
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
export const pdfParseQueue = new Queue('pdf-parse', { connection: redis });

export async function scrapeSaudeMgResolutions() {
  console.log('Iniciando scrape de Resoluções da SES/MG...');
  
  try {
    const response = await axios.get('https://www.saude.mg.gov.br/publicacoes/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = cheerio.load(response.data);
    const resolutions: Array<{ numero: string, url: string }> = [];

    // Lógica para raspar os links de publicações.
    // Baseado na estrutura do site, vamos procurar links de PDFs.
    $('a[href$=".pdf"]').each((_: any, element: any) => {
      const url = $(element).attr('href');
      const text = $(element).text().trim();
      
      // Checa se o texto menciona "Resolução" ou "Resolucoes" e captura o número
      if (url && text.toLowerCase().includes('resolução')) {
        const match = text.match(/(?:resolução|resolucao)\s*(?:ses\/mg\s*)?(?:nº|no|n\.|numero)?\s*(\d+)/i);
        if (match && match[1]) {
          resolutions.push({
             numero: match[1],
             url: url.startsWith('http') ? url : `https://www.saude.mg.gov.br${url.startsWith('/') ? '' : '/'}${url}`
          });
        }
      }
    });

    console.log(`Encontradas ${resolutions.length} resoluções com PDF na página.`);

    for (const res of resolutions) {
      // Verifica se a resolução já existe no banco
      const exists = await prisma.resolution.findUnique({
        where: { numero: res.numero }
      });

      if (!exists) {
        console.log(`Nova Resolução encontrada: ${res.numero}. Cadastrando no banco e enviando para processamento.`);
        
        const newResolution = await prisma.resolution.create({
          data: {
            numero: res.numero,
            url: 'https://www.saude.mg.gov.br/publicacoes/',
            pdfUrl: res.url,
            status: 'PENDING'
          }
        });

        // Envia o PDF para a fila de extração
        await pdfParseQueue.add('parse-resolution', {
          resolutionId: newResolution.id,
          pdfUrl: newResolution.pdfUrl
        });
      }
    }

    console.log('Scrape de resoluções finalizado com sucesso.');
  } catch (error) {
    console.error('Erro ao raspar resoluções da SES/MG:', error);
  }
}
