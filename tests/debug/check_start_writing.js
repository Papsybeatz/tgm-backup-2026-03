const playwright = require('playwright');
(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    // Set a user in localStorage so dashboard shows
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('user', JSON.stringify({ email: 'test@example.com', tier: 'free' })));
    await page.goto('http://localhost:5173/dashboard/free', { waitUntil: 'networkidle' });
    // Ensure Home button not present
    const homeBtn = await page.$('text=Home');
    console.log('Home button present:', !!homeBtn);
    // Click Start Writing and report URL
    const start = await page.$('text=Start Writing');
    if (start) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {}),
        start.click()
      ]);
      console.log('After click URL:', page.url());
      await page.screenshot({ path: 'tests/debug/check_start_writing.png', fullPage: true });
      console.log('screenshot saved to tests/debug/check_start_writing.png');
    } else {
      console.log('Start Writing button not found');
    }
  } catch (e) {
    console.error('check script error:', e.message);
  } finally {
    await browser.close();
  }
})();