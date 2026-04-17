const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const url = process.env.URL || 'http://localhost:5174/en';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const html = await page.content();
    fs.writeFileSync('/tmp/landing-rendered.html', html, 'utf8');
    console.log('Rendered HTML length:', html.length);
    await page.screenshot({ path: '/tmp/landing-rendered.png', fullPage: true });
    console.log('Screenshot saved to /tmp/landing-rendered.png');
  } catch (err) {
    console.error('Error rendering page:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
