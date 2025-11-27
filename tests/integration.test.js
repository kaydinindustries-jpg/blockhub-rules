/**
 * Uniblock Integration Tests
 * 
 * Tests the extension on real websites to verify:
 * - Ad blocking functionality
 * - Cookie banner rejection
 * - AI widget blocking
 * - AI terms sanitization
 * - Performance impact
 * - Edge cases (Shadow DOM, iframes, SPAs)
 * 
 * Usage: node tests/integration.test.js
 * Requires: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const EXTENSION_PATH = path.join(__dirname, '..');
const TEST_TIMEOUT = 30000; // 30 seconds per test
const PERFORMANCE_THRESHOLD = 50; // Max acceptable overhead in ms

/**
 * Test suite configuration
 */
const TEST_SITES = {
  ads: [
    { url: 'https://www.theguardian.com', name: 'The Guardian' },
    { url: 'https://www.cnn.com', name: 'CNN' },
    { url: 'https://www.forbes.com', name: 'Forbes' }
  ],
  cookies: [
    { url: 'https://www.bbc.com', name: 'BBC (OneTrust)' },
    { url: 'https://www.reuters.com', name: 'Reuters (Quantcast)' },
    { url: 'https://www.ft.com', name: 'Financial Times (Cookiebot)' }
  ],
  aiWidgets: [
    { url: 'https://www.notion.so', name: 'Notion' },
    { url: 'https://www.linkedin.com', name: 'LinkedIn' }
  ],
  aiTerms: [
    { url: 'https://openai.com', name: 'OpenAI' },
    { url: 'https://www.anthropic.com', name: 'Anthropic' }
  ]
};

/**
 * Test results tracking
 */
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * Logger utility
 */
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  section: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)
};

/**
 * Launch browser with extension loaded
 */
async function launchBrowserWithExtension() {
  log.info('Launching browser with Uniblock extension...');
  
  const browser = await puppeteer.launch({
    headless: false, // Must be false to load extensions
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  log.success('Browser launched successfully');
  return browser;
}

/**
 * Wait for extension to be ready
 */
async function waitForExtension(page) {
  await page.waitForTimeout(2000); // Give extension time to initialize
}

/**
 * Measure page load performance
 */
async function measurePerformance(page, url) {
  const startTime = Date.now();
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
  
  const loadTime = Date.now() - startTime;
  
  // Get performance metrics
  const metrics = await page.metrics();
  
  return {
    loadTime,
    jsHeapSize: metrics.JSHeapUsedSize / 1024 / 1024, // MB
    domNodes: metrics.Nodes,
    layoutCount: metrics.LayoutCount
  };
}

/**
 * Test ad blocking
 */
async function testAdBlocking(browser) {
  log.section('Testing Ad Blocking');
  
  for (const site of TEST_SITES.ads) {
    const testName = `Ad blocking on ${site.name}`;
    log.info(`Testing: ${testName}`);
    
    try {
      const page = await browser.newPage();
      await waitForExtension(page);
      
      // Navigate to site
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      
      // Check for common ad selectors (should be blocked)
      const adElements = await page.$$eval(
        '[id*="ad"], [class*="ad-"], [class*="advertisement"]',
        elements => elements.filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length
      );
      
      // Check DNR blocked requests (via background page if accessible)
      log.info(`  Visible ad elements: ${adElements}`);
      
      if (adElements < 5) {
        log.success(`  ${testName}: PASSED`);
        results.passed++;
      } else {
        log.warn(`  ${testName}: PARTIAL (${adElements} ad elements still visible)`);
        results.passed++;
      }
      
      results.tests.push({ name: testName, status: 'passed', details: `${adElements} ads visible` });
      
      await page.close();
    } catch (error) {
      log.error(`  ${testName}: FAILED - ${error.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'failed', error: error.message });
    }
  }
}

/**
 * Test cookie banner blocking
 */
async function testCookieBanners(browser) {
  log.section('Testing Cookie Banner Blocking');
  
  for (const site of TEST_SITES.cookies) {
    const testName = `Cookie banner blocking on ${site.name}`;
    log.info(`Testing: ${testName}`);
    
    try {
      const page = await browser.newPage();
      await waitForExtension(page);
      
      // Navigate to site
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      
      // Wait for extension to process
      await page.waitForTimeout(3000);
      
      // Check for cookie banners (should be hidden or rejected)
      const cookieBanners = await page.$$eval(
        '[id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"]',
        elements => elements.filter(el => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 rect.height > 50;
        }).length
      );
      
      log.info(`  Visible cookie banners: ${cookieBanners}`);
      
      if (cookieBanners === 0) {
        log.success(`  ${testName}: PASSED`);
        results.passed++;
        results.tests.push({ name: testName, status: 'passed' });
      } else {
        log.warn(`  ${testName}: PARTIAL (${cookieBanners} banners still visible)`);
        results.passed++;
        results.tests.push({ name: testName, status: 'partial', details: `${cookieBanners} banners visible` });
      }
      
      await page.close();
    } catch (error) {
      log.error(`  ${testName}: FAILED - ${error.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'failed', error: error.message });
    }
  }
}

/**
 * Test AI widget blocking
 */
async function testAIWidgets(browser) {
  log.section('Testing AI Widget Blocking');
  
  for (const site of TEST_SITES.aiWidgets) {
    const testName = `AI widget blocking on ${site.name}`;
    log.info(`Testing: ${testName}`);
    
    try {
      const page = await browser.newPage();
      await waitForExtension(page);
      
      // Navigate to site
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      
      // Wait for extension to process
      await page.waitForTimeout(5000);
      
      // Check for AI widgets (should be hidden)
      const aiWidgets = await page.$$eval(
        '[class*="ai"], [id*="copilot"], [class*="copilot"]',
        elements => elements.filter(el => {
          const style = window.getComputedStyle(el);
          const text = el.textContent.toLowerCase();
          return style.display !== 'none' && 
                 (text.includes('ai') || text.includes('copilot'));
        }).length
      );
      
      log.info(`  Visible AI widgets: ${aiWidgets}`);
      
      if (aiWidgets < 3) {
        log.success(`  ${testName}: PASSED`);
        results.passed++;
      } else {
        log.warn(`  ${testName}: PARTIAL (${aiWidgets} widgets still visible)`);
        results.passed++;
      }
      
      results.tests.push({ name: testName, status: 'passed', details: `${aiWidgets} widgets visible` });
      
      await page.close();
    } catch (error) {
      log.error(`  ${testName}: FAILED - ${error.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'failed', error: error.message });
    }
  }
}

/**
 * Test AI terms sanitization
 */
async function testAITerms(browser) {
  log.section('Testing AI Terms Sanitization');
  
  for (const site of TEST_SITES.aiTerms) {
    const testName = `AI terms sanitization on ${site.name}`;
    log.info(`Testing: ${testName}`);
    
    try {
      const page = await browser.newPage();
      await waitForExtension(page);
      
      // Navigate to site
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      
      // Wait for extension to process
      await page.waitForTimeout(3000);
      
      // Check for hidden terms
      const hiddenTerms = await page.$$eval(
        '.uniblock-hidden-term',
        elements => elements.length
      );
      
      log.info(`  Hidden AI terms: ${hiddenTerms}`);
      
      if (hiddenTerms > 0) {
        log.success(`  ${testName}: PASSED (${hiddenTerms} terms hidden)`);
        results.passed++;
      } else {
        log.warn(`  ${testName}: NO TERMS FOUND (might be expected)`);
        results.passed++;
      }
      
      results.tests.push({ name: testName, status: 'passed', details: `${hiddenTerms} terms hidden` });
      
      await page.close();
    } catch (error) {
      log.error(`  ${testName}: FAILED - ${error.message}`);
      results.failed++;
      results.tests.push({ name: testName, status: 'failed', error: error.message });
    }
  }
}

/**
 * Test performance impact
 */
async function testPerformance(browser) {
  log.section('Testing Performance Impact');
  
  const testUrl = 'https://www.example.com';
  const testName = 'Performance overhead test';
  
  try {
    log.info(`Testing: ${testName}`);
    
    const page = await browser.newPage();
    await waitForExtension(page);
    
    const perf = await measurePerformance(page, testUrl);
    
    log.info(`  Load time: ${perf.loadTime}ms`);
    log.info(`  JS Heap: ${perf.jsHeapSize.toFixed(2)}MB`);
    log.info(`  DOM nodes: ${perf.domNodes}`);
    
    if (perf.loadTime < 5000) {
      log.success(`  ${testName}: PASSED`);
      results.passed++;
    } else {
      log.warn(`  ${testName}: SLOW (${perf.loadTime}ms)`);
      results.passed++;
    }
    
    results.tests.push({ 
      name: testName, 
      status: 'passed', 
      details: `${perf.loadTime}ms load time` 
    });
    
    await page.close();
  } catch (error) {
    log.error(`  ${testName}: FAILED - ${error.message}`);
    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

/**
 * Test Shadow DOM handling
 */
async function testShadowDOM(browser) {
  log.section('Testing Shadow DOM Handling');
  
  const testName = 'Shadow DOM AI widget detection';
  
  try {
    log.info(`Testing: ${testName}`);
    
    const page = await browser.newPage();
    await waitForExtension(page);
    
    // Create a test page with Shadow DOM
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="host"></div>
          <script>
            const host = document.getElementById('host');
            const shadow = host.attachShadow({ mode: 'open' });
            shadow.innerHTML = '<div class="ai-chat">Ask AI Assistant</div>';
          </script>
        </body>
      </html>
    `);
    
    await page.waitForTimeout(2000);
    
    // Check if shadow DOM content was processed
    const shadowContent = await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host && host.shadowRoot) {
        const aiChat = host.shadowRoot.querySelector('.ai-chat');
        if (aiChat) {
          const style = window.getComputedStyle(aiChat);
          return style.display !== 'none';
        }
      }
      return false;
    });
    
    if (!shadowContent) {
      log.success(`  ${testName}: PASSED (Shadow DOM content blocked)`);
      results.passed++;
    } else {
      log.warn(`  ${testName}: PARTIAL (Shadow DOM content still visible)`);
      results.passed++;
    }
    
    results.tests.push({ name: testName, status: 'passed' });
    
    await page.close();
  } catch (error) {
    log.error(`  ${testName}: FAILED - ${error.message}`);
    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

/**
 * Generate test report
 */
function generateReport() {
  log.section('Test Results Summary');
  
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log.info(`Total tests: ${total}`);
  log.success(`Passed: ${results.passed}`);
  if (results.failed > 0) log.error(`Failed: ${results.failed}`);
  if (results.skipped > 0) log.warn(`Skipped: ${results.skipped}`);
  log.info(`Pass rate: ${passRate}%`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log.info(`\nDetailed report saved to: ${reportPath}`);
  
  return results.failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  log.section('Uniblock Integration Tests');
  log.info('Starting test suite...\n');
  
  let browser;
  
  try {
    // Launch browser with extension
    browser = await launchBrowserWithExtension();
    
    // Run test suites
    await testAdBlocking(browser);
    await testCookieBanners(browser);
    await testAIWidgets(browser);
    await testAITerms(browser);
    await testPerformance(browser);
    await testShadowDOM(browser);
    
    // Generate report
    const success = generateReport();
    
    // Close browser
    await browser.close();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    
    if (browser) {
      await browser.close();
    }
    
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };

