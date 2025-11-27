/**
 * BlockHub Background Service Worker
 *
 * Responsible for:
 * - Persisting user settings and metrics
 * - Managing rule data fetched from the CDN (with fallbacks)
 * - Handling messages between popup UI and content scripts
 * - Scheduling background maintenance tasks
 */

const PRODUCT_NAME = 'BlockHub';
const LOG_PREFIX = `[${PRODUCT_NAME}]`;
const ERROR_PREFIX = `[${PRODUCT_NAME} Error]`;

// Default settings for all features
const DEFAULT_SETTINGS = {
  blockAds: true,
  blockCookies: true,
  blockAIWidgets: true,
  hideAITerms: true,
  aiTermsMode: 'conservative', // 'conservative' or 'aggressive'
  whitelist: [] // Array of hostnames where extension is disabled
};

// Default metrics counters
const DEFAULT_METRICS = {
  adsBlocked: 0,
  cookiesRejected: 0,
  aiWidgetsRemoved: 0,
  aiTermsHidden: 0
};

/**
 * CDN index manifest URL (contains SHA-256 hashes for integrity verification)
 */
const INDEX_MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json';
const INDEX_CACHE_KEY = 'ruleCache:index';
const INDEX_CACHE_TTL_MS = 1000 * 60 * 60 * 1; // 1 hour (shorter than rule cache for fresher hashes)

/**
 * CDN rule endpoints (URLs are now fetched from index.json for integrity verification)
 * These are fallback URLs if index.json fails to load
 */
const RULE_ENDPOINTS = {
  aiTerms: 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/ai_terms.json',
  aiWidgetSelectors: 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/ai_widget_selectors.json',
  cookiePatterns: 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/cookie_patterns.json',
  killList: 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json',
  preserveList: 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/preserve_list.json'
};

/**
 * Local fallback files packaged with the extension
 * These guarantee the product still works when the CDN is unreachable.
 */
const FALLBACK_RULE_FILES = {
  aiTerms: 'utils/ai_terms.json',
  aiWidgetSelectors: 'utils/ai_widget_selectors.json',
  cookiePatterns: 'utils/cookie_patterns.json',
  killList: 'utils/kill_list.json',
  preserveList: 'utils/preserve_list.json'
};

// Cache control for rule fetching
const RULE_STORAGE_PREFIX = 'ruleCache:';
const RULE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const FALLBACK_RETRY_MS = 1000 * 60 * 15; // 15 minutes
const RULE_FETCH_TIMEOUT_MS = 8000; // 8 seconds
const RULE_CATEGORIES = Object.keys(RULE_ENDPOINTS);

// In-memory cache and deduplication for concurrent fetches
const inMemoryRuleCache = new Map();
const pendingRuleFetches = new Map();

/**
 * Utility: structured clone with fallback
 */
function cloneData(data) {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * Utility: logging helpers
 */
function log(message, ...args) {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

function logError(message, error) {
  console.error(`${ERROR_PREFIX} ${message}`, error);
}

/**
 * Compute SHA-256 hash of a string
 * Used for integrity verification of CDN-fetched rules
 */
async function computeSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility: ensure provided rule category is known
 */
function ensureCategory(category) {
  if (!RULE_ENDPOINTS[category]) {
    throw new Error(`Unknown rule category: ${category}`);
  }
}

/**
 * Utility: ensure value is an array
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Utility: ensure value is a plain object
 */
function ensureObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

/**
 * Normalize a single manually curated DOM entry (kill-list or preserve-list)
 */
function normalizeDomEntry(entry, { category = 'entry', index = 0, locale = null } = {}) {
  const selector = typeof entry?.selector === 'string' ? entry.selector.trim() : '';
  if (!selector) {
    throw new Error(`Missing selector in ${category} entry at index ${index}`);
  }

  const fallbackPatterns = entry?.fallbackPatterns
    ? {
        id: entry.fallbackPatterns.id ? String(entry.fallbackPatterns.id) : null,
        class: entry.fallbackPatterns.class ? String(entry.fallbackPatterns.class) : null
      }
    : null;

  const normalized = {
    id: entry?.id ? String(entry.id) : `${category}-${index}`,
    site: entry?.site || null,
    feature: entry?.feature || null,
    url: entry?.url || null,
    selector,
    cssPath: typeof entry?.cssPath === 'string' ? entry.cssPath.trim() : null,
    jsPath: typeof entry?.jsPath === 'string' ? entry.jsPath.trim() : null,
    outerHTML: typeof entry?.outerHTML === 'string' ? entry.outerHTML : null,
    text: typeof entry?.text === 'string' ? entry.text : null,
    textContains: typeof entry?.textContains === 'string' ? entry.textContains : null,
    fallbackPatterns,
    fingerprints: ensureObject(entry?.fingerprints),
    notes: typeof entry?.notes === 'string' ? entry.notes : null,
    category: entry?.category || null,
    locale: locale || entry?.locale || null
  };

  return normalized;
}

function normalizeDomEntryArray(entries, category) {
  return ensureArray(entries).map((entry, index) => normalizeDomEntry(entry, { category, index }));
}

/**
 * Normalize multi-language bucket sections (ads, aiTerms, etc.)
 */
function normalizeLanguageBuckets(rawSection, namespace) {
  const locales = {};

  const registerLocale = (localeKey, title, entries) => {
    const normalizedEntries = ensureArray(entries).map((entry, entryIndex) =>
      normalizeDomEntry(entry, {
        category: `${namespace}.${localeKey}`,
        index: entryIndex,
        locale: localeKey
      })
    );

    locales[localeKey] = {
      title: title || null,
      entries: normalizedEntries
    };
  };

  if (!rawSection) {
    return { locales, combined: [] };
  }

  if (Array.isArray(rawSection)) {
    const looksLikeSectionArray = rawSection.every(section =>
      section &&
      typeof section === 'object' &&
      !Array.isArray(section) &&
      Array.isArray(section.entries)
    );

    if (looksLikeSectionArray) {
      rawSection.forEach((section, index) => {
        const localeKey = (section.locale || `SECTION_${index}`).toUpperCase();
        registerLocale(localeKey, section.title || null, section.entries);
      });
    } else {
      registerLocale('GLOBAL', null, rawSection);
    }
  } else if (typeof rawSection === 'object') {
    Object.entries(rawSection).forEach(([locale, data]) => {
      const localeKey = locale.toUpperCase();
      if (Array.isArray(data?.entries)) {
        registerLocale(localeKey, data?.title || null, data.entries);
      } else {
        registerLocale(localeKey, null, data);
      }
    });
  }

  const combined = Object.values(locales).flatMap(bucket => bucket.entries);
  return { locales, combined };
}

/**
 * Normalize preserve list entries which use locale-based structure
 * Each entry in the array has: { locale, title, elements: [...] }
 */
function normalizePreserveListEntries(rawEntries) {
  if (!rawEntries || !Array.isArray(rawEntries)) {
    return { locales: {}, combined: [] };
  }

  const locales = {};
  
  rawEntries.forEach((localeGroup, groupIndex) => {
    const localeKey = (localeGroup.locale || `SECTION_${groupIndex}`).toUpperCase();
    const elements = ensureArray(localeGroup.elements);
    
    const normalizedElements = elements.map((entry, entryIndex) => {
      const selector = typeof entry?.selector === 'string' ? entry.selector.trim() : '';
      if (!selector) {
        // Skip entries without selectors instead of throwing
        log(`Skipping preserve entry without selector at ${localeKey}[${entryIndex}]`);
        return null;
      }

      return {
        id: entry?.id ? String(entry.id) : `preserve-${localeKey}-${entryIndex}`,
        site: entry?.site || null,
        feature: entry?.feature || null,
        url: entry?.url || null,
        selector,
        cssPath: typeof entry?.cssPath === 'string' ? entry.cssPath.trim() : null,
        jsPath: typeof entry?.jsPath === 'string' ? entry.jsPath.trim() : null,
        outerHTML: typeof entry?.outerHTML === 'string' ? entry.outerHTML : null,
        text: typeof entry?.text === 'string' ? entry.text : null,
        textContains: typeof entry?.textContains === 'string' ? entry.textContains : null,
        fallbackPatterns: entry?.fallbackPatterns || null,
        fingerprints: ensureObject(entry?.fingerprints),
        notes: typeof entry?.notes === 'string' ? entry.notes : null,
        locale: localeKey
      };
    }).filter(Boolean); // Remove null entries

    locales[localeKey] = {
      title: localeGroup.title || null,
      elements: normalizedElements
    };
  });

  const combined = Object.values(locales).flatMap(bucket => bucket.elements || []);
  return { locales, combined };
}

/**
 * Utility: shallow equality via JSON
 * Safe because rule payloads are plain data objects.
 */
function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Fetch helper with timeout guard
 */
async function fetchWithTimeout(url, { timeout = RULE_FETCH_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    return response;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      if (controller.signal.aborted) {
        throw new Error(`Request to ${url} timed out after ${timeout}ms`);
      }
      throw new Error(`Request to ${url} was aborted by the environment`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalize and validate rule payloads
 * Ensures consumers always receive predictable structures.
 */
function normalizeRuleData(category, rawData) {
  ensureCategory(category);

  switch (category) {
    case 'aiTerms': {
      const conservative = ensureArray(rawData?.conservative);
      const aggressive = ensureArray(rawData?.aggressive);

      if (conservative.length === 0) {
        throw new Error('aiTerms.conservative must contain at least one entry');
      }

      return {
        conservative,
        aggressive
      };
    }

    case 'aiWidgetSelectors': {
      const selectors = ensureArray(rawData?.selectors);
      const platforms = ensureObject(rawData?.platforms);
      const textPatternsRaw = ensureObject(rawData?.text_patterns);

      if (selectors.length === 0) {
        throw new Error('aiWidgetSelectors.selectors must contain at least one entry');
      }

      const text_patterns = Object.entries(textPatternsRaw).reduce((acc, [locale, values]) => {
        acc[locale] = ensureArray(values);
        return acc;
      }, {});

      return {
        selectors,
        platforms,
        text_patterns
      };
    }

    case 'cookiePatterns': {
      const reject_phrases = ensureArray(rawData?.reject_phrases);
      const excluded_domains = ensureArray(rawData?.excluded_domains);
      const cmpsRaw = ensureArray(rawData?.cmps);

      if (reject_phrases.length === 0) {
        throw new Error('cookiePatterns.reject_phrases must contain at least one entry');
      }

      const cmps = cmpsRaw.map((cmp) => ({
        name: cmp?.name || 'Unnamed CMP',
        detect_selectors: ensureArray(cmp?.detect_selectors),
        reject_selectors: ensureArray(cmp?.reject_selectors),
        reject_text_patterns: ensureArray(cmp?.reject_text_patterns)
      }));

      return {
        reject_phrases,
        excluded_domains,
        cmps
      };
    }

    case 'killList': {
      return {
        metadata: {
          version: rawData?.version || '1.0.0',
          lastUpdated: rawData?.lastUpdated || null
        },
        locales: ensureArray(rawData?.locales),
        ads: normalizeLanguageBuckets(rawData?.ads, 'killList.ads'),
        aiTerms: normalizeLanguageBuckets(rawData?.aiTerms, 'killList.aiTerms'),
        aiWidgets: normalizeLanguageBuckets(rawData?.aiWidgets, 'killList.aiWidgets'),
        cookies: normalizeLanguageBuckets(rawData?.cookies, 'killList.cookies')
      };
    }

    case 'preserveList': {
      // preserveList uses the same locale-based structure as killList
      // entries is an array of locale objects, each with an 'elements' array
      const processedEntries = normalizePreserveListEntries(rawData?.entries);
      return {
        metadata: {
          version: rawData?.version || '1.0.0',
          lastUpdated: rawData?.lastUpdated || null
        },
        locales: ensureArray(rawData?.locales),
        entries: processedEntries
      };
    }

    default:
      throw new Error(`Normalization not implemented for category ${category}`);
  }
}

/**
 * Determine if a rule record is still fresh based on origin
 */
function isRecordFresh(record) {
  if (!record || !record.fetchedAt) {
    return false;
  }

  const age = Date.now() - record.fetchedAt;
  const ttl = record.source === 'cdn' ? RULE_CACHE_TTL_MS : FALLBACK_RETRY_MS;
  return age < ttl;
}

/**
 * Load cached record from chrome.storage.local
 */
async function loadRuleFromStorage(category) {
  ensureCategory(category);
  const key = `${RULE_STORAGE_PREFIX}${category}`;
  const stored = await chrome.storage.local.get(key);
  const record = stored[key];
  if (!record || !record.data) {
    return null;
  }

  try {
    // Re-validate to guard against accidental corruption
    const normalized = normalizeRuleData(category, record.data);
    return {
      ...record,
      category,
      data: normalized
    };
  } catch (error) {
    logError(`Cached rule invalid for ${category}, clearing storage copy`, error);
    await chrome.storage.local.remove(key);
    return null;
  }
}

/**
 * Persist rule record to chrome.storage.local
 */
async function saveRuleToStorage(category, record) {
  ensureCategory(category);
  const key = `${RULE_STORAGE_PREFIX}${category}`;
  await chrome.storage.local.set({
    [key]: {
      ...record,
      data: cloneData(record.data)
    }
  });
}

/**
 * Fetch and cache the index manifest (contains SHA-256 hashes for integrity verification)
 */
async function fetchIndexManifest() {
  try {
    // Check cache first
    const cached = await chrome.storage.local.get(INDEX_CACHE_KEY);
    if (cached[INDEX_CACHE_KEY]) {
      const age = Date.now() - cached[INDEX_CACHE_KEY].fetchedAt;
      if (age < INDEX_CACHE_TTL_MS) {
        log('Using cached index manifest');
        return cached[INDEX_CACHE_KEY].data;
      }
    }

    // Fetch fresh manifest
    log('Fetching index manifest from CDN...');
    const response = await fetchWithTimeout(INDEX_MANIFEST_URL);
    
    if (!response.ok) {
      throw new Error(`Index manifest fetch failed: HTTP ${response.status}`);
    }

    const manifest = await response.json();
    
    // Validate manifest structure
    if (!manifest.files || typeof manifest.files !== 'object') {
      throw new Error('Invalid manifest structure: missing files object');
    }

    // Cache it
    await chrome.storage.local.set({
      [INDEX_CACHE_KEY]: {
        data: manifest,
        fetchedAt: Date.now()
      }
    });

    log(`Index manifest fetched (version ${manifest.version || 'unknown'})`);
    return manifest;
  } catch (error) {
    logError('Failed to fetch index manifest, will use fallback URLs', error);
    // Return null to fallback to direct URLs without hash verification
    return null;
  }
}

/**
 * Fetch rule set from CDN with SHA-256 integrity verification
 */
async function fetchRuleFromCdn(category) {
  ensureCategory(category);
  
  // Fetch index manifest to get expected hash
  const manifest = await fetchIndexManifest();
  
  let url = RULE_ENDPOINTS[category];
  let expectedHash = null;
  
  if (manifest && manifest.files && manifest.files[category]) {
    const fileInfo = manifest.files[category];
    url = fileInfo.url;
    expectedHash = fileInfo.sha256;
    log(`Fetching ${category} with integrity check (hash: ${expectedHash.substring(0, 16)}...)`);
  } else {
    log(`Fetching ${category} without integrity check (manifest unavailable)`);
  }

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`CDN responded with HTTP ${response.status}`);
    }

    // Get raw text to compute hash before parsing
    const rawText = await response.text();
    
    // Verify integrity if we have an expected hash
    if (expectedHash) {
      const actualHash = await computeSHA256(rawText);
      
      if (actualHash !== expectedHash) {
        throw new Error(
          `Integrity check FAILED for ${category}:\n` +
          `  Expected: ${expectedHash.substring(0, 32)}...\n` +
          `  Got:      ${actualHash.substring(0, 32)}...`
        );
      }
      
      log(`✓ Integrity verified for ${category}`);
    }

    // Parse JSON after verification
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      throw new Error(`Invalid JSON received from CDN: ${parseError.message}`);
    }

    const normalized = normalizeRuleData(category, json);

    return {
      category,
      data: normalized,
      source: 'cdn',
      url,
      fetchedAt: Date.now(),
      lastError: null,
      lastFailureAt: null,
      verified: expectedHash !== null,
      hash: expectedHash
    };
  } catch (error) {
    throw new Error(`CDN fetch failed for ${category}: ${error.message}`);
  }
}

/**
 * Load packaged fallback rules
 */
async function loadFallbackRule(category) {
  ensureCategory(category);
  const path = FALLBACK_RULE_FILES[category];
  if (!path) {
    throw new Error(`No fallback file declared for ${category}`);
  }

  const fallbackUrl = chrome.runtime.getURL(path);
  const response = await fetch(fallbackUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load fallback from ${path} (HTTP ${response.status})`);
  }

  let json;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(`Invalid JSON in fallback file ${path}: ${error.message}`);
  }

  const normalized = normalizeRuleData(category, json);

  return {
    category,
    data: normalized,
    source: 'fallback-local',
    url: fallbackUrl,
    fetchedAt: Date.now(),
    lastError: null,
    lastFailureAt: null
  };
}

/**
 * Broadcast rule updates to every active tab
 */
async function broadcastRuleUpdate(category, metadata = {}) {
  const tabs = await chrome.tabs.query({});
  const payload = {
    type: 'RULES_UPDATED',
    category,
    source: metadata.source || null,
    fetchedAt: metadata.fetchedAt || Date.now()
  };

  await Promise.all(
    tabs.map(tab =>
      chrome.tabs.sendMessage(tab.id, payload).catch(() => {
        // Ignore tabs without our content scripts
        return null;
      })
    )
  );
}

/**
 * Retrieve rule data (from memory, storage, CDN, or fallback)
 */
async function retrieveRule(category, { forceRefresh = false } = {}) {
  ensureCategory(category);

  const memoryRecord = inMemoryRuleCache.get(category);
  if (!forceRefresh && isRecordFresh(memoryRecord)) {
    return cloneData(memoryRecord);
  }

  let storedRecord = await loadRuleFromStorage(category);
  if (!forceRefresh && storedRecord && isRecordFresh(storedRecord)) {
    inMemoryRuleCache.set(category, storedRecord);
    return cloneData(storedRecord);
  }

  if (pendingRuleFetches.has(category)) {
    return cloneData(await pendingRuleFetches.get(category));
  }

  const fetchPromise = (async () => {
    let priorData = memoryRecord?.data || storedRecord?.data || null;

    try {
      const ruleRecord = await fetchRuleFromCdn(category);
      inMemoryRuleCache.set(category, ruleRecord);
      await saveRuleToStorage(category, ruleRecord);

      if (!priorData || !deepEqual(priorData, ruleRecord.data)) {
        await broadcastRuleUpdate(category, ruleRecord);
      }

      log(`Rules loaded from CDN for ${category} (${ruleRecord.data?.length || Object.keys(ruleRecord.data || {}).length} entries)`);
      return ruleRecord;
    } catch (cdnError) {
      logError(`CDN fetch failed for ${category}`, cdnError);

      // Prefer last known good data from storage if available
      if (storedRecord && storedRecord.data) {
        const record = {
          ...storedRecord,
          lastError: cdnError.message,
          lastFailureAt: Date.now()
        };
        inMemoryRuleCache.set(category, record);
        await saveRuleToStorage(category, record);
        return record;
      }

      // Fall back to packaged defaults
      try {
        const fallbackRecord = await loadFallbackRule(category);
        const record = {
          ...fallbackRecord,
          lastError: cdnError.message,
          lastFailureAt: Date.now()
        };
        inMemoryRuleCache.set(category, record);
        await saveRuleToStorage(category, record);
        log(`Using packaged fallback rules for ${category}`);
        return record;
      } catch (fallbackError) {
        logError(`Fallback load failed for ${category}`, fallbackError);
        throw new Error(
          `No rule data available for ${category}. CDN error: ${cdnError.message}. Fallback error: ${fallbackError.message}`
        );
      }
    }
  })();

  pendingRuleFetches.set(category, fetchPromise);

  try {
    const resolved = await fetchPromise;
    return cloneData(resolved);
  } finally {
    pendingRuleFetches.delete(category);
  }
}

/**
 * Refresh every rule category (optionally forcing a CDN pull)
 */
async function refreshAllRules(forceRefresh = false) {
  for (const category of RULE_CATEGORIES) {
    try {
      await retrieveRule(category, { forceRefresh });
    } catch (error) {
      logError(`Unable to refresh rules for ${category}`, error);
    }
  }
}

/**
 * Initialize extension on install or update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  log(`Extension installed/updated: ${details.reason}`);

  // Initialize settings if not present
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    log('Default settings initialized');
  }

  // Initialize metrics if not present
  const { metrics } = await chrome.storage.local.get('metrics');
  if (!metrics) {
    await chrome.storage.local.set({ metrics: DEFAULT_METRICS });
    log('Default metrics initialized');
  }

  // Update badge with total blocked count
  await updateBadge();

  // Prepare background alarms
  chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 }); // 24 hours
  chrome.alarms.create('rulesRefresh', { periodInMinutes: 180 }); // every 3 hours

  // Force refresh rules on install/update to guarantee fresh data
  await refreshAllRules(true);
});

/**
 * Handle alarm events for periodic tasks
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyCleanup') {
    log('Running daily cleanup');
    // Placeholder: cleanup tasks, telemetry pruning, etc.
    return;
  }

  if (alarm.name === 'rulesRefresh') {
    log('Scheduled rules refresh triggered');
    await refreshAllRules(true);
  }
});

/**
 * Update extension badge with total blocked items count
 */
async function updateBadge() {
  try {
    const { metrics } = await chrome.storage.local.get('metrics');
    if (!metrics) return;

    const total = metrics.adsBlocked + metrics.cookiesRejected +
                  metrics.aiWidgetsRemoved + metrics.aiTermsHidden;

    // Format large numbers (e.g., 1234 -> 1.2K)
    let badgeText = '';
    if (total >= 1000000) {
      badgeText = (total / 1000000).toFixed(1) + 'M';
    } else if (total >= 1000) {
      badgeText = (total / 1000).toFixed(1) + 'K';
    } else if (total > 0) {
      badgeText = total.toString();
    }

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } catch (error) {
    logError('Error updating badge', error);
  }
}

/**
 * Increment a specific metric counter
 * @param {string} metric - Metric name (adsBlocked, cookiesRejected, etc.)
 * @param {number} count - Amount to increment by
 */
async function incrementMetric(metric, count = 1) {
  try {
    const { metrics } = await chrome.storage.local.get('metrics');
    const currentMetrics = metrics || cloneData(DEFAULT_METRICS);

    if (metric in currentMetrics) {
      currentMetrics[metric] += count;
      await chrome.storage.local.set({ metrics: currentMetrics });
      await updateBadge();
    }
  } catch (error) {
    logError('Error incrementing metric', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_SETTINGS': {
          const { settings } = await chrome.storage.local.get('settings');
          sendResponse({ success: true, settings: settings || cloneData(DEFAULT_SETTINGS) });
          break;
        }

        case 'UPDATE_SETTINGS': {
          // IMPORTANT: Merge new settings with existing ones, don't replace!
          const { settings: existingSettings } = await chrome.storage.local.get('settings');
          const mergedSettings = {
            ...(existingSettings || cloneData(DEFAULT_SETTINGS)),
            ...message.settings
          };
          await chrome.storage.local.set({ settings: mergedSettings });
          const tabs = await chrome.tabs.query({});
          await Promise.all(
            tabs.map(tab =>
              chrome.tabs.sendMessage(tab.id, {
                type: 'SETTINGS_UPDATED',
                settings: mergedSettings // Send complete merged settings, not partial
              }).catch(() => null)
            )
          );
          sendResponse({ success: true });
          break;
        }

        case 'GET_METRICS': {
          const { metrics } = await chrome.storage.local.get('metrics');
          sendResponse({ success: true, metrics: metrics || cloneData(DEFAULT_METRICS) });
          break;
        }

        case 'INCREMENT_METRIC': {
          await incrementMetric(message.metric, message.count || 1);
          sendResponse({ success: true });
          break;
        }

        case 'RESET_METRICS': {
          await chrome.storage.local.set({ metrics: cloneData(DEFAULT_METRICS) });
          await updateBadge();
          sendResponse({ success: true });
          break;
        }

        case 'GET_RULE_SET': {
          const category = message.rule;
          ensureCategory(category);
          const record = await retrieveRule(category, { forceRefresh: message.forceRefresh === true });
          sendResponse({
            success: true,
            rule: record.data,
            source: record.source,
            fetchedAt: record.fetchedAt,
            lastError: record.lastError || null
          });
          break;
        }

        case 'FORCE_RULE_REFRESH_ALL': {
          await refreshAllRules(true);
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      logError('Error handling message', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

/**
 * Handle storage changes and update badge
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.metrics) {
    updateBadge();
  }
});

// Initialize badge and warm caches on startup
updateBadge();

refreshAllRules(false).catch((error) => {
  logError('Initial rules preload failed', error);
});

log('Background service worker initialized');

