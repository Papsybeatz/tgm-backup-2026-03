const playwright = require('playwright');
(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/en', { waitUntil: 'networkidle' });
  const html = await page.content();
  console.log('PAGE HTML SNIPPET:\n', html.slice(0, 2000));
  await page.screenshot({ path: 'tests/debug/en.png', fullPage: true });
  console.log('screenshot saved to tests/debug/en.png');
  await browser.close();
})();