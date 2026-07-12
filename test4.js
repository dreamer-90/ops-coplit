const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let logCount = 0;
  page.on('console', msg => {
    logCount++;
    console.log('BROWSER LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 5000));
  console.log(`Total logs in 5 seconds: ${logCount}`);
  await browser.close();
})();
