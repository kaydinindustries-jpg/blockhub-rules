/**
 * BlockHub Cookie Banner Blocker
 * 
 * Automatically detects and rejects cookie consent banners across all websites.
 * Supports major CMPs (Consent Management Platforms) and generic fallback detection.
 * Multilingual support for reject button text matching.
 */

(async function() {
  'use strict';

  // Check if feature is enabled and site is not whitelisted
  let settings = await window.UnibleckShared.getSettings();
  if (!settings.blockCookies || await window.UnibleckShared.isCurrentSiteWhitelisted()) {
    return;
  }

  let EXCLUDED_DOMAINS = [];
  let REJECT_PATTERNS = [];
  let CMP_CONFIGS = [];

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeDomain(domain) {
    return typeof domain === 'string' ? domain.trim().toLowerCase() : '';
  }

  function normalizePhrase(phrase) {
    return typeof phrase === 'string' ? phrase.trim().toLowerCase() : '';
  }

  function queryVisibleElements(selector) {
    try {
      return Array.from(document.querySelectorAll(selector)).filter(element =>
        window.UnibleckShared.isElementVisible(element)
      );
    } catch (error) {
      return [];
    }
  }

  function safeClick(element) {
    if (!element) return;
    try {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (error) {
      element.click();
    }
  }

  function detectSelector(selector) {
    if (!selector) return false;

    if (selector === '__tcfapi' || selector === 'window.__tcfapi') {
      return typeof window.__tcfapi === 'function';
    }

    try {
      return Boolean(document.querySelector(selector));
    } catch (error) {
      return false;
    }
  }

  function detectBySelectors(selectors) {
    return ensureArray(selectors).some(detectSelector);
  }

  function clickSelectorsSequentially(selectors, delay = 200) {
    const list = ensureArray(selectors);
    if (!list.length) {
      return false;
    }

    let clickedImmediately = false;

    list.forEach((selector, index) => {
      const elements = queryVisibleElements(selector);

      if (elements.length > 0) {
        elements.forEach(safeClick);
        clickedImmediately = true;
      } else {
        setTimeout(() => {
          queryVisibleElements(selector).forEach(safeClick);
        }, delay * (index + 1));
      }
    });

    return clickedImmediately;
  }

  function attemptRejectByText(patterns = []) {
    const combined = new Set();

    ensureArray(patterns).forEach(pattern => {
      const normalized = normalizePhrase(pattern);
      if (normalized) combined.add(normalized);
    });

    REJECT_PATTERNS.forEach(pattern => combined.add(pattern));

    if (combined.size === 0) {
      return false;
    }

    const clickables = Array.from(document.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"], [onclick]'
    ));

    for (const element of clickables) {
      if (!window.UnibleckShared.isElementVisible(element)) continue;

      const text = (element.textContent ||
                   element.value ||
                   element.getAttribute('aria-label') ||
                   element.getAttribute('title') ||
                   '').toLowerCase().trim();

      if (!text) continue;

      for (const pattern of combined) {
        if (text.includes(pattern)) {
          safeClick(element);
          window.UnibleckShared.log(`Clicked reject element by text match: "${pattern}"`);
          return true;
        }
      }
    }

    return false;
  }

  function buildCmpConfigs(rawCmps = []) {
    return ensureArray(rawCmps).map((cmpRule) => {
      const name = cmpRule?.name || 'Unnamed CMP';
      const detectSelectors = ensureArray(cmpRule?.detect_selectors);
      const rejectSelectors = ensureArray(cmpRule?.reject_selectors);
      const rejectTextPatterns = ensureArray(cmpRule?.reject_text_patterns)
        .map(normalizePhrase)
        .filter(Boolean);

      return {
        name,
        detect: () => detectBySelectors(detectSelectors),
        reject: () => {
          const selectorResult = clickSelectorsSequentially(rejectSelectors);
          const textResult = attemptRejectByText(rejectTextPatterns);
          return selectorResult || textResult;
        }
      };
    });
  }

  async function loadCookieRules(forceRefresh = false) {
    try {
      const rules = await window.UnibleckShared.getRuleSet('cookiePatterns', { forceRefresh });

      if (!rules) {
        EXCLUDED_DOMAINS = [];
        REJECT_PATTERNS = [];
        CMP_CONFIGS = [];
        return;
      }

      EXCLUDED_DOMAINS = ensureArray(rules.excluded_domains)
        .map(normalizeDomain)
        .filter(Boolean);

      REJECT_PATTERNS = ensureArray(rules.reject_phrases)
        .map(normalizePhrase)
        .filter(Boolean);

      CMP_CONFIGS = buildCmpConfigs(rules.cmps);

      window.UnibleckShared.log(
        `Cookie patterns loaded: ${EXCLUDED_DOMAINS.length} exclusions, ${REJECT_PATTERNS.length} phrases, ${CMP_CONFIGS.length} CMP entries`
      );
    } catch (error) {
      window.UnibleckShared.logError('Failed to load cookie pattern rules', error);
      EXCLUDED_DOMAINS = [];
      REJECT_PATTERNS = [];
      CMP_CONFIGS = [];
    }
  }

  await loadCookieRules();

  const currentDomain = window.location.hostname.toLowerCase();
  const isExcluded = EXCLUDED_DOMAINS.some(domain =>
    currentDomain === domain || currentDomain.endsWith('.' + domain)
  );

  if (isExcluded) {
    window.UnibleckShared.log('Cookie blocker: Domain excluded, skipping');
    return;
  }

  /**
   * Check if text matches any reject pattern
   * @param {string} text - Text to check
   * @returns {boolean} True if matches reject pattern
   */
  function matchesRejectPattern(text) {
    if (!text) return false;
    const normalized = text.toLowerCase().trim();
    return REJECT_PATTERNS.some(pattern => normalized.includes(pattern));
  }

  /**
   * Generic cookie banner detection and rejection
   * Looks for common patterns in buttons and links
   */
  function genericReject() {
    let rejected = false;

    // Find all clickable elements
    const clickables = Array.from(document.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"], [onclick]'
    ));

    for (const element of clickables) {
      // Skip if already processed
      if (element.hasAttribute('data-uniblock-processed')) continue;

      // Get text content
      const text = element.textContent || element.value || element.getAttribute('aria-label') || '';
      
      // Check if matches reject pattern
      if (matchesRejectPattern(text)) {
        // Additional validation: element should be visible
        if (window.UnibleckShared.isElementVisible(element)) {
          element.click();
          element.setAttribute('data-uniblock-processed', 'true');
          rejected = true;
          window.UnibleckShared.log('Generic reject clicked:', text);
          break; // Only click one reject button
        }
      }
    }

    return rejected;
  }

  /**
   * Hide cookie banners via CSS
   * Used as fallback when auto-reject fails
   */
  function hideBanners() {
    const selectors = [
      // Generic cookie/consent selectors
      '[id*="cookie" i]:not(script):not(style)',
      '[class*="cookie" i]:not(script):not(style)',
      '[id*="consent" i]:not(script):not(style)',
      '[class*="consent" i]:not(script):not(style)',
      '[id*="gdpr" i]:not(script):not(style)',
      '[class*="gdpr" i]:not(script):not(style)',
      '[aria-label*="cookie" i]',
      '[aria-label*="consent" i]',
      
      // Common CMP containers
      '.cc-banner', '.cc-window', '.cookie-banner', '.cookie-notice',
      '.consent-banner', '.consent-modal', '.privacy-banner',
      
      // Overlay/backdrop
      '[class*="overlay" i][class*="cookie" i]',
      '[class*="backdrop" i][class*="consent" i]'
    ];

    let hiddenCount = 0;
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Skip if already hidden or is a small element (likely not a banner)
          if (element.hasAttribute('data-uniblock-hidden')) return;
          
          const rect = element.getBoundingClientRect();
          if (rect.height < 50 || rect.width < 100) return;
          
          // Hide the element
          window.UnibleckShared.hideElement(element, 'cookie-banner');
          hiddenCount++;
        });
      } catch (e) {
        // Silently ignore invalid selectors
      }
    });

    if (hiddenCount > 0) {
      window.UnibleckShared.log(`Hidden ${hiddenCount} cookie banner elements`);
    }

    return hiddenCount > 0;
  }

  /**
   * Main processing function
   * Tries CMP-specific rejection, then generic, then hiding
   */
  function processCookieBanners() {
    let handled = false;

    // Try known CMPs first
    for (const cmp of CMP_CONFIGS) {
      try {
        if (cmp.detect()) {
          window.UnibleckShared.log(`Detected CMP: ${cmp.name}`);
          if (cmp.reject()) {
            window.UnibleckShared.log(`Rejected via ${cmp.name}`);
            window.UnibleckShared.incrementMetric('cookiesRejected', 1);
            handled = true;
            break;
          }
        }
      } catch (e) {
        window.UnibleckShared.logError(`Error processing ${cmp.name}`, e);
      }
    }

    // Try generic rejection if CMP-specific failed
    if (!handled) {
      if (genericReject()) {
        window.UnibleckShared.log('Rejected via generic detection');
        window.UnibleckShared.incrementMetric('cookiesRejected', 1);
        handled = true;
      }
    }

    // Hide banners as fallback
    if (hideBanners()) {
      if (!handled) {
        // Only count as rejection if we didn't already reject
        window.UnibleckShared.incrementMetric('cookiesRejected', 1);
      }
      handled = true;
    }

    return handled;
  }

  /**
   * Throttled processing function
   * Prevents excessive processing on rapid DOM changes
   */
  const throttledProcess = window.UnibleckShared.throttle(processCookieBanners, 500);

  /**
   * Set up MutationObserver to watch for dynamically added banners
   * IMPORTANT: Observer can be disconnected when feature is disabled
   */
  let observer = null;
  
  function setupObserver() {
    // CRITICAL: Check if feature is still enabled before setting up observer
    if (!settings.blockCookies) {
      window.UnibleckShared.log('Cookie banner observer: Feature disabled, not starting');
      return;
    }
    
    observer = new MutationObserver((mutations) => {
      // CRITICAL: Check if feature is still enabled before processing
      if (!settings.blockCookies) {
        if (observer) {
          observer.disconnect();
          observer = null;
          window.UnibleckShared.log('Cookie banner observer: Feature disabled, disconnecting');
        }
        return;
      }
      
      // Check if any mutations added nodes that might be cookie banners
      let shouldProcess = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if added node or its children might be a cookie banner
              const text = node.textContent || '';
              if (text.toLowerCase().includes('cookie') || 
                  text.toLowerCase().includes('consent') ||
                  text.toLowerCase().includes('privacy')) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }

      if (shouldProcess) {
        window.UnibleckShared.executeWhenIdle(throttledProcess);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.UnibleckShared.log('Cookie banner observer initialized');
  }
  
  /**
   * Clean up observer when feature is disabled
   * CRITICAL: Ensures observer stops when user turns off cookie blocking
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
      window.UnibleckShared.log('Cookie banner observer: Cleaned up');
    }
  }
  
  // Listen for settings changes to stop observer if feature is disabled
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings) {
        settings = newSettings;
      }
      if (newSettings && !newSettings.blockCookies) {
        cleanup();
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      const previousState = settings.blockCookies;
      settings = message.settings;

      if (!settings.blockCookies) {
        cleanup();
      } else if (!previousState && settings.blockCookies) {
        processCookieBanners();
        if (!observer) {
          setupObserver();
        }
      }
    } else if (message.type === 'RULES_UPDATED' && message.category === 'cookiePatterns') {
      (async () => {
        await loadCookieRules(true);

        const nowExcluded = EXCLUDED_DOMAINS.some(domain =>
          currentDomain === domain || currentDomain.endsWith('.' + domain)
        );

        if (nowExcluded) {
          window.UnibleckShared.log('Cookie blocker: Domain became excluded after rule update, stopping');
          cleanup();
          return;
        }

        if (!settings.blockCookies) {
          return;
        }

        processCookieBanners();
        window.UnibleckShared.log('Cookie patterns refreshed from background update');
      })();
    }
  });

  // Initial processing
  await window.UnibleckShared.waitForDOMReady();
  
  // Process immediately
  processCookieBanners();
  
  // Process again after a short delay (some banners load late)
  setTimeout(processCookieBanners, 1000);
  setTimeout(processCookieBanners, 3000);
  
  // Set up observer for dynamic content
  setupObserver();

  window.UnibleckShared.log('Cookie banner blocker initialized');
})();

