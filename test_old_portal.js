const https = require('https');
const cheerio = require('cheerio');

async function fetchPortal(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function run() {
    const url = 'https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=';
    const html = await fetchPortal(url);
    const $ = cheerio.load(html);
    $('.document-item').each((i, el) => {
        const title = $(el).find('h2, h3, .title').text().trim();
        const date = $(el).find('.date').text().trim() || $(el).find('time').text().trim() || $(el).text().match(/\d{2} de [a-zA-Z]+ de \d{4}/i)?.[0];
        console.log(`Title: ${title} | Date: ${date}`);
    });
    
    // just try generic search if classes are wrong
    console.log("Regex search over text for 14 de julho:");
    const matches = html.match(/.{0,50}14 de julho de 2026.{0,50}/gi);
    if(matches) {
       console.log(matches);
    }
}
run();
