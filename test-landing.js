const { chromium } = require('@playwright/test');
const http = require('http');

function checkServer(url, timeout = 500, retries = 20) {
  const parsed = new URL(url);
  return new Promise((resolve) => {
    let attempts = 0;
    const tryOnce = () => {
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'GET',
          timeout: 2000,
        },
        (res) => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
      req.on('error', () => {
        attempts += 1;
        if (attempts >= retries) return resolve(false);
        setTimeout(tryOnce, timeout);
      });
      req.on('timeout', () => req.destroy());
      req.end();
    };
    tryOnce();
  });
}

(async () => {
  const url = 'http://localhost:5173/en';
  const up = await checkServer(url, 500, 40);
  if (!up) {
    console.error(`Dev server not responding at ${url}. Start Vite with \`npm run dev\` and retry.`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Get page content
  const content = await page.content();
  console.log('Page HTML length:', content.length);

  // Get any visible text
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Page text:', text.substring(0, 2000));

  await browser.close();
})();