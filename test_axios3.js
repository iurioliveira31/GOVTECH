const axios = require('axios');
const fs = require('fs');
async function test() {
  try {
    const res = await axios.get('https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q=');
    fs.writeFileSync('axios_output.html', res.data);
    console.log("Written to axios_output.html");
  } catch (e) {
    console.error(e.message);
  }
}
test();
