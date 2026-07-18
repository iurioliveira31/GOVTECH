const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  try {
    const res = await axios.get('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=');
    const html = res.data;
    const $ = cheerio.load(html);
    $('.document-item').each((_, el) => {
        const title = $(el).find('h2, h3, .title').text().trim();
        const date = $(el).find('.date').text().trim() || $(el).find('time').text().trim() || $(el).text().match(/\d{2} de [a-zA-Z]+ de \d{4}/i)?.[0];
        console.log(`Title: ${title} | Date: ${date}`);
    });
  } catch (e) {
    console.error(e.message);
  }
}
test();
