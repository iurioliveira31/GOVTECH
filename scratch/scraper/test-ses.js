const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to SesLegis...');
    await page.goto('https://seslegis.saude.mg.gov.br/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Let's set up listeners to capture popups or downloads
    page.on('popup', async (popup) => {
      console.log('Popup opened:', popup.url());
    });

    page.on('download', (download) => {
      console.log('Download triggered:', download.url());
    });

    console.log('Clicking the normative card...');
    // Click on the first card that contains Resolução
    await page.click('article:has-text("Resolução SES/MG nº 11489"), article:has-text("RESOLUÇÃO")');
    
    // Wait a few seconds for actions to complete
    await page.waitForTimeout(5000);
    
    console.log('Current URL after click:', page.url());

  } catch (error) {
    console.error('Error during click:', error);
  } finally {
    await browser.close();
  }
})();
