const cheerio = require('cheerio');
fetch('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=')
.then(r => r.text())
.then(html => {
  const $ = cheerio.load(html);
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    if(text.includes('14')) {
      console.log(text, $(el).attr('href'));
    }
  });
});
