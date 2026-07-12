const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
  
  console.log('Testing clicks...');
  const langTabs = await page.$$('.lang-tabs button, #lang-tabs button');
  console.log('Found lang tabs:', langTabs.length);
  if (langTabs.length > 0) {
    await langTabs[1].click();
    console.log('Clicked lang tab');
  }

  const filterBtns = await page.$$('.feed-filter-btn');
  console.log('Found filter btns:', filterBtns.length);
  if (filterBtns.length > 0) {
    await filterBtns[1].click();
    console.log('Clicked filter btn');
  }
  
  await new Promise(r => setTimeout(r, 500));
  await browser.close();
})();
