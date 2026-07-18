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
        console.log("Fetching new portal 500 items...");
        const newApi = 'https://seslegis.saude.mg.gov.br/api/v1/normatives/public/search?page=1&size=500&sortField=normative_date&sortOrder=desc';
        const newApiData = await fetchPortal(newApi);
        const newApiJson = JSON.parse(newApiData);
        if (newApiJson.data) {
            newApiJson.data.forEach(item => {
                const date = new Date(item.normative_date).toISOString().split('T')[0];
                if (date === '2026-07-14') {
                    console.log(`[New API] ${date} - ${item.title}`);
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}
run();
