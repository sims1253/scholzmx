const { firefox } = require('playwright');
const fs = require('fs');

async function runFirefoxTest() {
  try {
    console.log('Starting Firefox performance test...');
    
    const browser = await firefox.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log('Firefox browser launched, navigating to page...');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    
    console.log('Page loaded in', loadTime, 'ms');
    
    const metrics = await page.evaluate((loadTimeParam) => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart : 0,
        loadComplete: perfData ? perfData.loadEventEnd - perfData.loadEventStart : 0,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        timestamp: new Date().toISOString(),
        browser: 'Firefox',
        totalLoadTime: perfData ? perfData.loadEventEnd - perfData.fetchStart : 0,
        pageLoadTime: loadTimeParam
      };
    }, loadTime);
    
    console.log('Firefox Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    fs.writeFileSync('firefox-performance.json', JSON.stringify(metrics, null, 2));
    
    await browser.close();
    console.log('Firefox test completed successfully');
    
  } catch (error) {
    console.error('Firefox test failed:', error);
    const errorMetrics = {
      domContentLoaded: 0,
      loadComplete: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      timestamp: new Date().toISOString(),
      browser: 'Firefox',
      error: error.message,
      pageLoadTime: 0,
      totalLoadTime: 0
    };
    fs.writeFileSync('firefox-performance.json', JSON.stringify(errorMetrics, null, 2));
    throw error;
  }
}

runFirefoxTest();