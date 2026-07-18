const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=');
    console.log("Length:", res.data.length);
  } catch (e) {
    console.error(e.message);
  }
}
test();
