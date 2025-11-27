/**
 * Uniblock Shared Utilities
 * 
 * Common utilities used across all content scripts including settings
 * management, logging, metrics, and helper functions.
 */

// Cache for settings to avoid repeated storage calls
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Cache for remote rule payloads (lightweight client-side memoization)
const RULE_CACHE_DURATION = 60000; // 60 seconds
const ruleCacheStore = new Map();

// Preserve-list cache (small and shared by every content script)
const preserveRuleStore = {
  entries: [],
  lastLoadedAt: 0,
  loadingPromise: null
};

/**
 * Get current extension settings with caching
 * @returns {Promise<Object>} Current settings object
 */
async function getSettings() {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return settingsCache;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response && response.success) {
      settingsCache = response.settings;
      cacheTimestamp = now;
      return settingsCache;
    }
  } catch (error) {
    logError('Failed to get settings', error);
  }
  
  // Return default settings if fetch fails
  return {
    blockAds: true,
    blockCookies: true,
    blockAIWidgets: true,
    hideAITerms: true,
    aiTermsMode: 'conservative',
    whitelist: []
  };
}

/**
 * Check if extension is disabled for current site
 * @returns {Promise<boolean>} True if site is whitelisted
 */
async function isCurrentSiteWhitelisted() {
  const settings = await getSettings();
  const hostname = window.location.hostname;
  return settings.whitelist && settings.whitelist.includes(hostname);
}

/**
 * Invalidate settings cache (call when settings change)
 */
function invalidateSettingsCache() {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Listen for settings updates from background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    invalidateSettingsCache();
    settingsCache = message.settings;
    cacheTimestamp = Date.now();
  } else if (message.type === 'RULES_UPDATED') {
    if (message.category) {
      ruleCacheStore.delete(message.category);
      if (message.category === 'preserveList') {
        invalidatePreserveRules();
      }
    } else {
      ruleCacheStore.clear();
      invalidatePreserveRules();
    }
  }
});

/**
 * Retrieve dynamic rule sets from background with client-side caching
 * @param {string} rule - Rule category name (aiTerms, aiWidgetSelectors, etc.)
 * @param {Object} options
 * @param {boolean} [options.forceRefresh=false] - Force bypass of local cache
 * @returns {Promise<Object|null>} Rule payload or null if unavailable
 */
async function getRuleSet(rule, { forceRefresh = false } = {}) {
  if (!rule) {
    throw new Error('Rule name is required');
  }

  const now = Date.now();
  const cached = ruleCacheStore.get(rule);
  if (!forceRefresh && cached && (now - cached.timestamp) < RULE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_RULE_SET',
      rule,
      forceRefresh
    });

    if (response && response.success && response.rule) {
      const entry = {
        data: response.rule,
        timestamp: now,
        source: response.source || 'unknown',
        fetchedAt: response.fetchedAt || now,
        lastError: response.lastError || null
      };
      ruleCacheStore.set(rule, entry);
      return entry.data;
    }

    const messageText = response && response.error ? response.error : 'Unknown rule retrieval error';
    logError(`Rule request failed for ${rule}`, new Error(messageText));
  } catch (error) {
    logError(`Failed to retrieve rule set ${rule}`, error);
  }

  // Fallback to stale cache if available
  if (cached) {
    return cached.data;
  }

  return null;
}

/**
 * Invalidate cached rule entries
 * @param {string} [rule] - Optional rule name; clears all caches when omitted
 */
function invalidateRuleCache(rule) {
  if (rule) {
    ruleCacheStore.delete(rule);
  } else {
    ruleCacheStore.clear();
  }
}

/**
 * Load preserve-list (safelist) rules. Cached aggressively to avoid redundant lookups.
 * @param {Object} options
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<Array>}
 */
async function loadPreserveRules({ forceRefresh = false } = {}) {
  const now = Date.now();
  const cacheIsFresh = preserveRuleStore.entries.length > 0 &&
    (now - preserveRuleStore.lastLoadedAt) < RULE_CACHE_DURATION;

  if (!forceRefresh && cacheIsFresh) {
    return preserveRuleStore.entries;
  }

  if (preserveRuleStore.loadingPromise) {
    return preserveRuleStore.loadingPromise;
  }

  preserveRuleStore.loadingPromise = (async () => {
    const payload = await getRuleSet('preserveList', { forceRefresh });
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    preserveRuleStore.entries = entries;
    preserveRuleStore.lastLoadedAt = Date.now();
    return preserveRuleStore.entries;
  })().catch((error) => {
    logError('Failed to load preserve list', error);
    return preserveRuleStore.entries;
  }).finally(() => {
    preserveRuleStore.loadingPromise = null;
  });

  return preserveRuleStore.loadingPromise;
}

function matchesPreserveRule(element, rule) {
  if (!element || !rule) {
    return false;
  }

  if (rule.selector) {
    try {
      if (element.matches(rule.selector)) {
        return true;
      }
    } catch (error) {
      logError(`Invalid preserve selector: ${rule.selector}`, error);
    }
  }

  if (rule.text && rule.text.length >= 1) {
    const elementText = (element.textContent || '').trim();
    if (elementText && elementText.includes(rule.text)) {
      return true;
    }
  }

  return false;
}

/**
 * Check synchronously if an element should be preserved.
 * Assumes loadPreserveRules() has been awaited earlier in the script lifecycle.
 */
function isElementPreserved(element) {
  if (!element || preserveRuleStore.entries.length === 0) {
    return false;
  }

  return preserveRuleStore.entries.some((entry) => matchesPreserveRule(element, entry));
}

function invalidatePreserveRules() {
  preserveRuleStore.entries = [];
  preserveRuleStore.lastLoadedAt = 0;
}

/**
 * Increment a metric counter in background
 * @param {string} metric - Metric name (adsBlocked, cookiesRejected, etc.)
 * @param {number} count - Amount to increment by
 */
async function incrementMetric(metric, count = 1) {
  try {
    await chrome.runtime.sendMessage({
      type: 'INCREMENT_METRIC',
      metric: metric,
      count: count
    });
  } catch (error) {
    // Silently fail - metrics are not critical
    logError('Failed to increment metric', error);
  }
}

/**
 * Logging utility (only logs in development mode)
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
function log(message, ...args) {
  // Only log in development (can be controlled via settings in future)
  if (typeof DEBUG !== 'undefined' && DEBUG) {
    console.log(`[BlockHub] ${message}`, ...args);
  }
}

/**
 * Error logging utility (always logs errors)
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function logError(message, error) {
  console.error(`[BlockHub Error] ${message}`, error);
}

/**
 * Check if element is visible in viewport
 * @param {Element} element - DOM element to check
 * @returns {boolean} True if element is visible
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Check if current page is a checkout/payment page
 * @returns {boolean} True if page appears to be checkout/payment
 */
function isCheckoutPage() {
  const url = window.location.href.toLowerCase();
  const checkoutKeywords = ['checkout', 'cart', 'payment', 'order', 'purchase', 'billing'];
  return checkoutKeywords.some(keyword => url.includes(keyword));
}

/**
 * Safely hide an element with important CSS
 * @param {Element} element - Element to hide
 * @param {string} reason - Reason for hiding (for data attribute)
 */
function hideElement(element, reason = 'blocked') {
  if (!element) return;
  
  element.style.setProperty('display', 'none', 'important');
  element.style.setProperty('visibility', 'hidden', 'important');
  element.style.setProperty('opacity', '0', 'important');
  element.setAttribute('data-uniblock-hidden', reason);
}

/**
 * Create a throttled function that only executes once per interval
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, delay) {
  let timeoutId = null;
  let lastExecTime = 0;
  
  return function(...args) {
    const currentTime = Date.now();
    const timeSinceLastExec = currentTime - lastExecTime;
    
    if (timeSinceLastExec >= delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - timeSinceLastExec);
    }
  };
}

/**
 * Create a debounced function that only executes after delay of inactivity
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId = null;
  
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Wait for DOM to be ready
 * @returns {Promise<void>}
 */
function waitForDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

/**
 * Execute callback when idle or after timeout
 * @param {Function} callback - Function to execute
 * @param {number} timeout - Maximum wait time in milliseconds
 */
function executeWhenIdle(callback, timeout = 1000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}

// Export utilities for use in other content scripts
window.UnibleckShared = {
  getSettings,
  isCurrentSiteWhitelisted,
  invalidateSettingsCache,
  getRuleSet,
  invalidateRuleCache,
  loadPreserveRules,
  isElementPreserved,
  invalidatePreserveRules,
  incrementMetric,
  log,
  logError,
  isElementVisible,
  isCheckoutPage,
  hideElement,
  throttle,
  debounce,
  waitForDOMReady,
  executeWhenIdle
};

