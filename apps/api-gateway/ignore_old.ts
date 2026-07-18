import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

async function run() {
  console.log('Buscando resoluções...');
  const resolucoesEncontradas: { numero: string, url: string, pdfUrl: string }[] = [];

  // API nova
  try {
    const resp = await fetch('https://seslegis.saude.mg.gov.br/api/v1/normatives/public?page=1&per_page=50&category_id=1&sort_by=published_at&sort_order=desc', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (resp.ok) {
      const body = await resp.json() as any;
      if (body && Array.isArray(body.data)) {
        for (const item of body.data) {
          const title = item.title || '';
          const match = title.match(/(?:resolu[çc][ãa]o|res\.?|delibera[çc][ãa]o|delib\.?)\s*(?:(?:ses|ces|cib-sus)(?:[\/\-A-Z]+)?\s*)?(?:n[oº°]?\s*\.?)?\s*([0-9]+(?:\.[0-9]+)*)/i);
          if (match && match[1]) {
             const isDeliberacao = title.toLowerCase().includes('delibera');
             const numero = `${isDeliberacao ? 'Deliberação' : 'Resolução'} ${match[1]}`;
             resolucoesEncontradas.push({
                numero,
                url: `https://seslegis.saude.mg.gov.br/normativa/${item.id}`,
                pdfUrl: `https://seslegis.saude.mg.gov.br/api/v1/normatives/public/${item.id}/download` // fake for now, just to have a unique url
             });
          }
        }
      }
    }
  } catch(e) {}

  // Portal antigo
  const urlsAntigas = [
    'https://portal-antigo.saude.mg.gov.br/resolucoes',
    'https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q='
  ];
  for (const targetUrl of urlsAntigas) {
    try {
      const resp = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (resp.ok) {
        const html = await resp.text();
        const $ = cheerio.load(html);
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href) {
            const isPdf = href.toLowerCase().endsWith('.pdf') || href.includes('&task=download');
            const lowerText = text.toLowerCase();
            const hasResolucaoText = lowerText.includes('resolução') || lowerText.includes('resolucao') || lowerText.includes('res.') || lowerText.includes('res ') || lowerText.includes('deliberação') || lowerText.includes('deliberacao') || lowerText.includes('delib.');
            if (isPdf || hasResolucaoText) {
              const match = text.match(/(?:resolu[çc][ãa]o|res\.?|delibera[çc][ãa]o|delib\.?)\s*(?:(?:ses|ces|cib-sus)(?:[\/\-A-Z]+)?\s*)?(?:n[oº°]?\s*\.?)?\s*([0-9]+(?:\.[0-9]+)*)/i);
              if (match && match[1]) {
                const isDeliberacao = text.toLowerCase().includes('delibera');
                const numero = `${isDeliberacao ? 'Deliberação' : 'Resolução'} ${match[1]}`;
                let pdfUrl = href;
                if (!href.startsWith('http')) {
                  pdfUrl = `https://portal-antigo.saude.mg.gov.br${href.startsWith('/') ? '' : '/'}${href}`;
                }
                resolucoesEncontradas.push({ numero, url: targetUrl, pdfUrl });
              }
            }
          }
        });
      }
    } catch(e) {}
  }

  console.log(`Encontradas ${resolucoesEncontradas.length} resoluções.`);
  let count = 0;
  for (const res of resolucoesEncontradas) {
    // PULAR as do dia 14
    if (res.numero.includes('10024') || res.numero.includes('10.024') || 
        res.numero.includes('5874') || res.numero.includes('194')) {
      console.log('Ignorando do dia 14:', res.numero);
      continue;
    }

    const existe = await prisma.resolution.findFirst({
      where: { OR: [ { pdfUrl: res.pdfUrl }, { title: res.numero } ] }
    });

    if (!existe) {
      await prisma.resolution.create({
        data: {
          title: res.numero,
          url: res.url,
          pdfUrl: res.pdfUrl,
          status: 'IGNORED',
          dataPublicacao: new Date('2020-01-01')
        }
      });
      count++;
    }
  }
  console.log(`Inseridas ${count} como IGNORED.`);
  
  // Clean up any PROCESSED or ERROR that were older than July 14, just in case
  // Wait, no need, just let them be.
}

run().catch(console.error).finally(() => prisma.$disconnect());
