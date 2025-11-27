/**
 * BlockHub Kill-List Blocker
 * 
 * Blocks specific DOM elements based on a manually curated kill-list.
 * This provides surgical precision for blocking ads and AI widgets that
 * bypass standard detection methods.
 * 
 * The kill-list is maintained in utils/killlist.json and contains:
 * - Specific selectors for known ad/AI elements
 * - Attribute patterns to match
 * - Class/ID patterns for fuzzy matching
 */

(async function() {
  'use strict';

  // Check if feature is enabled and site is not whitelisted
  let settings = await window.UnibleckShared.getSettings();
  if (await window.UnibleckShared.isCurrentSiteWhitelisted()) {
    return;
  }

  /**
   * Load kill-list from JSON file
   * CRITICAL: This is the manually curated list of elements to block
   * New format: Array of objects with selector, fallbackPatterns, textContains
   */
  const EMPTY_KILL_LIST = {
    metadata: {},
    ads: [],
    adsLocales: {},
    aiTerms: [],
    aiTermsLocales: {},
    aiWidgets: [],
    aiWidgetsLocales: {},
    cookies: [],
    cookieLocales: {}
  };
  let KILLLIST = EMPTY_KILL_LIST;

  async function loadKillList(forceRefresh = false) {
    try {
      const data = await window.UnibleckShared.getRuleSet('killList', { forceRefresh });

      if (data) {
        const flattenBucket = (bucket) => {
          if (!bucket) return [];
          if (Array.isArray(bucket)) return bucket;
          if (Array.isArray(bucket.combined)) return bucket.combined;
          return [];
        };

        const extractLocales = (bucket) => {
          if (!bucket?.locales) return {};
          return Object.entries(bucket.locales).reduce((acc, [locale, payload]) => {
            acc[locale] = payload?.entries || [];
            return acc;
          }, {});
        };

        KILLLIST = {
          metadata: data.metadata || {},
          ads: flattenBucket(data.ads),
          adsLocales: extractLocales(data.ads),
          aiTerms: flattenBucket(data.aiTerms),
          aiTermsLocales: extractLocales(data.aiTerms),
          aiWidgets: flattenBucket(data.aiWidgets),
          aiWidgetsLocales: extractLocales(data.aiWidgets),
          cookies: flattenBucket(data.cookies),
          cookieLocales: extractLocales(data.cookies)
        };

        window.UnibleckShared.log(
          `Kill-list loaded: ${KILLLIST.ads.length} ads, ${KILLLIST.aiTerms.length} AI terms, ${KILLLIST.aiWidgets.length} AI widgets, ${KILLLIST.cookies.length} cookies`
        );
      } else {
        KILLLIST = EMPTY_KILL_LIST;
        window.UnibleckShared.log('Kill-list unavailable; defaulting to empty rule set');
      }
    } catch (error) {
      window.UnibleckShared.logError('Failed to load kill-list rules', error);
      KILLLIST = EMPTY_KILL_LIST;
    }
  }

  /**
   * Check if element matches a kill-list entry
   * CRITICAL: Multi-stage matching with STRICT verification
   * Made more strict to prevent false positives
   * @param {Element} element - Element to check
   * @param {Object} entry - Kill-list entry with selector, fallbackPatterns, textContains
   * @returns {boolean} True if element matches
   */
  function matchesKillListEntry(element, entry) {
    if (!element || !entry) return false;

    let selectorMatched = false;
    let fallbackMatched = false;

    // Stage 1: Try exact selector match (fastest)
    try {
      if (entry.selector && element.matches(entry.selector)) {
        selectorMatched = true;
        
        // STRICT: If textContains is specified, it MUST match
        if (entry.textContains) {
          const text = element.textContent || '';
          if (!text.includes(entry.textContains)) {
            return false; // Selector matched but required text doesn't
          }
        }
        
        // Selector matched (and text verified if required)
        return true;
      }
    } catch (e) {
      // Invalid selector, continue to fallback
    }

    // Stage 2: Try fallback patterns (ID/class) - ONLY if selector didn't match
    // STRICT: Require EXACT match on fallback patterns, not partial
    if (!selectorMatched && entry.fallbackPatterns) {
      const patterns = entry.fallbackPatterns;
      
      // Check ID pattern - STRICT: must match exactly or be a substring
      if (patterns.id && patterns.id !== null) {
        const elementId = element.id || '';
        if (elementId === patterns.id || elementId.includes(patterns.id)) {
          fallbackMatched = true;
        }
      }
      
      // Check class pattern - STRICT: must match exactly or be a substring
      if (patterns.class && patterns.class !== null) {
        const elementClass = element.className?.toString() || '';
        if (elementClass === patterns.class || elementClass.includes(patterns.class)) {
          fallbackMatched = true;
        }
      }
      
      // If fallback matched, verify text if specified
      if (fallbackMatched && entry.textContains) {
        const text = element.textContent || '';
        if (!text.includes(entry.textContains)) {
          return false; // Fallback matched but required text doesn't
        }
      }
      
      if (fallbackMatched) {
        return true;
      }
    }

    // Stage 3: Text-based matching (slowest, most flexible)
    // STRICT: Only use if BOTH selector and fallback failed
    // AND textContains is the PRIMARY identifier (not just verification)
    if (!selectorMatched && !fallbackMatched && entry.textContains) {
      const text = element.textContent || '';
      // STRICT: Text must be substantial (not just whitespace)
      // Minimum 2 characters to catch "AI" and other short terms
      if (text.trim().length >= 2 && text.includes(entry.textContains)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Block an element from the kill-list
   * @param {Element} element - Element to block
   * @param {string} category - Category (ads, aiWidgets, cookieBanners)
   * @param {string} reason - Reason for blocking
   */
  function blockKillListElement(element, category, reason = 'killlist') {
    if (!element || element.hasAttribute('data-uniblock-hidden')) {
      return;
    }

    if (window.UnibleckShared.isElementPreserved(element)) {
      window.UnibleckShared.log(`Preserve-list override prevented blocking (${category}/${reason})`);
      return;
    }

    window.UnibleckShared.hideElement(element, `killlist-${category}-${reason}`);
    
    // Increment appropriate metric based on category
    if (category === 'ads' && settings.blockAds) {
      window.UnibleckShared.incrementMetric('adsBlocked', 1);
    } else if (category === 'aiWidgets' && settings.blockAIWidgets) {
      window.UnibleckShared.incrementMetric('aiWidgetsRemoved', 1);
    } else if (category === 'cookieBanners' && settings.blockCookies) {
      window.UnibleckShared.incrementMetric('cookiesRejected', 1);
    }

    window.UnibleckShared.log(`Blocked kill-list element (${category}/${reason}):`, element);
  }

  /**
   * Scan and block elements from ads kill-list
   * CRITICAL: This catches ads that bypass standard detection
   * New approach: Iterate through kill-list entries and find matching elements
   */
  function scanAdsKillList() {
    if (!settings.blockAds || !KILLLIST || !KILLLIST.ads || KILLLIST.ads.length === 0) return 0;

    let blockedCount = 0;

    // Iterate through each kill-list entry
    KILLLIST.ads.forEach(entry => {
      // First, try to find by selector (fastest)
      if (entry.selector) {
        try {
          const elements = document.querySelectorAll(entry.selector);
          elements.forEach(element => {
            if (!element.hasAttribute('data-uniblock-hidden')) {
              // Verify it matches (including text check if specified)
              if (matchesKillListEntry(element, entry)) {
                blockKillListElement(element, 'ads', `entry-${entry.id}`);
                blockedCount++;
              }
            }
          });
        } catch (e) {
          // Invalid selector, will try fallback patterns below
        }
      }

      // If selector didn't work or didn't find anything, try fallback patterns
      // This is slower but catches elements even if selector changes
      if (entry.fallbackPatterns) {
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          if (element.hasAttribute('data-uniblock-hidden')) return;
          
          // Check if element matches via fallback patterns
          if (matchesKillListEntry(element, entry)) {
            blockKillListElement(element, 'ads', `entry-${entry.id}-fallback`);
            blockedCount++;
          }
        });
      }
    });

    return blockedCount;
  }

  /**
   * Scan and block elements from AI terms kill-list
   * CRITICAL: This catches AI text elements AND UI icons/logos that bypass standard detection
   * IMPORTANT: For aiTerms, we ONLY use the kill-list (no fallback, no automatic detection)
   * This includes: text labels, tooltips, summaries, icons, logos, UI elements
   * Note: Using "aiTerms" from kill-list, can be used for both text AND visual elements
   */
  function scanAITermsKillList() {
    // Only run if AI terms sanitizer OR AI widgets blocker is enabled
    // (aiTerms can contain both text and UI elements)
    if ((!settings.hideAITerms && !settings.blockAIWidgets) || !KILLLIST || !KILLLIST.aiTerms || KILLLIST.aiTerms.length === 0) return 0;

    let blockedCount = 0;

    // Iterate through each kill-list entry
    // IMPORTANT: For aiTerms, we ONLY use exact selector matching (no fallback)
    // This prevents false positives and ensures surgical precision
    KILLLIST.aiTerms.forEach(entry => {
      // ONLY try to find by exact selector (no fallback patterns)
      if (entry.selector) {
        try {
          const elements = document.querySelectorAll(entry.selector);
          elements.forEach(element => {
            if (!element.hasAttribute('data-uniblock-hidden')) {
              // For aiTerms: ONLY check selector match (no fallback)
              // If textContains is specified, verify it
              let shouldBlock = true;
              
              if (entry.textContains) {
                const text = element.textContent || '';
                if (!text.includes(entry.textContains)) {
                  shouldBlock = false; // Text doesn't match
                }
              }
              
              if (shouldBlock) {
                blockKillListElement(element, 'aiWidgets', `aiterm-${entry.id}`);
                blockedCount++;
              }
            }
          });
        } catch (e) {
          // Invalid selector, skip this entry
          window.UnibleckShared.logError(`Invalid selector in aiTerms entry ${entry.id}`, e);
        }
      }
    });

    return blockedCount;
  }

  /**
   * Scan and block elements from AI widgets kill-list
   * CRITICAL: This catches AI chat widgets that bypass standard detection
   */
  function scanAIWidgetsKillList() {
    // Only run if AI widgets blocker is enabled
    if (!settings.blockAIWidgets || !KILLLIST || !KILLLIST.aiWidgets || KILLLIST.aiWidgets.length === 0) return 0;

    let blockedCount = 0;

    // Iterate through each kill-list entry
    KILLLIST.aiWidgets.forEach(entry => {
      // First, try to find by selector (fastest)
      if (entry.selector) {
        try {
          const elements = document.querySelectorAll(entry.selector);
          elements.forEach(element => {
            if (!element.hasAttribute('data-uniblock-hidden')) {
              // STRICT: Verify it matches with all criteria
              if (matchesKillListEntry(element, entry)) {
                blockKillListElement(element, 'aiWidgets', `widget-${entry.id}`);
                blockedCount++;
              }
            }
          });
        } catch (e) {
          // Invalid selector, skip this entry
          window.UnibleckShared.logError(`Invalid selector in aiWidgets entry ${entry.id}`, e);
        }
      }
    });

    return blockedCount;
  }

  /**
   * Scan and block elements from cookies kill-list
   * CRITICAL: This catches cookie banners that bypass standard detection
   */
  function scanCookiesKillList() {
    // Only run if cookie blocker is enabled
    if (!settings.blockCookies || !KILLLIST || !KILLLIST.cookies || KILLLIST.cookies.length === 0) return 0;

    let blockedCount = 0;

    // Iterate through each kill-list entry
    KILLLIST.cookies.forEach(entry => {
      // First, try to find by selector (fastest)
      if (entry.selector) {
        try {
          const elements = document.querySelectorAll(entry.selector);
          elements.forEach(element => {
            if (!element.hasAttribute('data-uniblock-hidden')) {
              // STRICT: Verify it matches with all criteria
              if (matchesKillListEntry(element, entry)) {
                blockKillListElement(element, 'cookieBanners', `cookie-${entry.id}`);
                blockedCount++;
              }
            }
          });
        } catch (e) {
          // Invalid selector, skip this entry
          window.UnibleckShared.logError(`Invalid selector in cookies entry ${entry.id}`, e);
        }
      }
    });

    return blockedCount;
  }

  /**
   * Main scan function - processes all kill-lists
   * CRITICAL: This is the entry point for kill-list blocking
   * Scans all 4 categories: ads, aiTerms, aiWidgets, cookies
   */
  function scanAllKillLists() {
    if (!KILLLIST) return 0;

    let totalBlocked = 0;

    // Scan each category independently
    totalBlocked += scanAdsKillList();
    totalBlocked += scanAITermsKillList();
    totalBlocked += scanAIWidgetsKillList();
    totalBlocked += scanCookiesKillList();

    if (totalBlocked > 0) {
      window.UnibleckShared.log(`Kill-list blocked ${totalBlocked} elements`);
    }

    return totalBlocked;
  }

  /**
   * Throttled scan function
   * CRITICAL: Prevents excessive scanning
   */
  const throttledScan = window.UnibleckShared.throttle(scanAllKillLists, 1000);

  /**
   * Set up MutationObserver to watch for dynamically added elements
   * CRITICAL: Watches for new elements that match kill-list
   */
  function setupObserver() {
    let mutationCount = 0;
    const MUTATION_THRESHOLD = 10; // Process after 10 mutations

    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;

      if (mutationCount < MUTATION_THRESHOLD) {
        return;
      }

      mutationCount = 0;
      let shouldScan = false;

      // Check if any added nodes might match kill-list
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }

      if (shouldScan) {
        requestAnimationFrame(() => {
          window.UnibleckShared.executeWhenIdle(throttledScan);
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.UnibleckShared.log('Kill-list observer initialized');
  }

  /**
   * Reload kill-list (can be called when kill-list is updated)
   * CRITICAL: Allows hot-reloading of kill-list without extension reload
   */
  async function reloadKillList() {
    await loadKillList(true);
    scanAllKillLists();
    window.UnibleckShared.log('Kill-list reloaded and rescanned');
  }

  // Make reload function available globally for manual updates
  window.UnibleckReloadKillList = reloadKillList;

  // Initialize
  await window.UnibleckShared.waitForDOMReady();
  
  // Load kill-list
  await loadKillList();
  await window.UnibleckShared.loadPreserveRules();
  
  // Initial scan - delayed to not interfere with page load
  setTimeout(scanAllKillLists, 1500);
  
  // Scan again after content loads
  setTimeout(scanAllKillLists, 4000);
  
  // Set up observer for dynamic content
  setupObserver();

  // Listen for rule refresh events from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      settings = message.settings;
    } else if (message.type === 'RULES_UPDATED' && message.category === 'killList') {
      reloadKillList();
    } else if (message.type === 'RULES_UPDATED' && message.category === 'preserveList') {
      window.UnibleckShared.loadPreserveRules(true).catch((error) => window.UnibleckShared.logError('Failed to reload preserve list', error));
    }
  });
  
  window.UnibleckShared.log('Kill-list blocker initialized');
})();

