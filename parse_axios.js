const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('axios_output.html');
const $ = cheerio.load(html);
$('.document-item').each((_, el) => {
    const title = $(el).find('h2, h3, .title').text().trim() || $(el).find('a').text().trim();
    const date = $(el).find('.date').text().trim() || $(el).find('time').text().trim() || $(el).text().match(/\d{2} de [a-zA-Z]+ de \d{4}/i)?.[0];
    if (title.includes('194')) {
        console.log(`Title: ${title} | Date: ${date}`);
    }
});
