const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating to http://localhost:3000");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  console.log("Waiting for demo users to load and clicking login...");
  try {
    await page.waitForSelector('.submit-btn', { timeout: 5000 });
    // Click the first login button (ACSAC Admin)
    await page.click('.submit-btn');
    
    // Wait a bit to see if an error is thrown
    await new Promise(r => setTimeout(r, 2000));
    console.log("Done checking.");
  } catch (err) {
    console.log("Error during interaction:", err);
  }

  await browser.close();
})();
