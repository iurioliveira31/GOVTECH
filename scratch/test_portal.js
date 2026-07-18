const cheerio = require('cheerio');
fetch('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=')
.then(r => r.text())
.then(html => {
  const $ = cheerio.load(html);
  const links = [];
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    if(text.toLowerCase().includes('delibera') || text.toLowerCase().includes('resolu') || ($(el).attr('href') || '').includes('pdf')) {
      links.push({ text, href: $(el).attr('href') });
    }
  });
  console.log(JSON.stringify(links.slice(0, 30), null, 2));
});
