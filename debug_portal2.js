const https = require('https');
const cheerio = require('cheerio');

async function fetchPortal(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function run() {
    try {
        console.log("Fetching old portal 2...");
        const html = await fetchPortal('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=');
        const $ = cheerio.load(html);
        $('a').each((i, el) => {
            const txt = $(el).text().trim();
            if (txt.includes('14') || txt.toLowerCase().includes('resolu')) {
                console.log(`[Old Portal 2] ${txt}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}
run();
