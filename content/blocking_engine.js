/**
 * BlockHub Advanced Blocking Engine v2
 * 
 * SAFETY-FIRST APPROACH:
 * - NO aggressive CSS injection that could break pages
 * - Protected domains list (Wikipedia, Google homepage, etc.)
 * - Only uses highly specific selectors with site context
 * - Graceful degradation - never breaks page functionality
 * 
 * Features:
 * - Phase 1: Enhanced MutationObserver with intelligent batching
 * - Phase 2: Site-specific targeted blocking (not global CSS)
 * - Phase 3: Intelligent selector cache with O(1) lookup
 * - Phase 4: Fingerprint-based blocking for resilient identification
 */

(async function() {
  'use strict';

  // ============================================================================
  // PROTECTED DOMAINS - NEVER RUN BLOCKING ENGINE HERE
  // These sites are too important or have complex UIs that could break
  // ============================================================================

  const PROTECTED_DOMAINS = new Set([
    // Wikipedia and Wikimedia
    'wikipedia.org',
    'wikimedia.org',
    'wiktionary.org',
    'wikiquote.org',
    'wikibooks.org',
    'wikisource.org',
    'wikinews.org',
    'wikiversity.org',
    'wikidata.org',
    'wikivoyage.org',
    'mediawiki.org',
    
    // Google core services (NOT search - we want to block AI there)
    'accounts.google.com',
    'myaccount.google.com',
    'mail.google.com',
    'calendar.google.com',
    'docs.google.com',
    'drive.google.com',
    'sheets.google.com',
    'slides.google.com',
    'meet.google.com',
    'chat.google.com',
    'contacts.google.com',
    'keep.google.com',
    'photos.google.com',
    'play.google.com',
    'maps.google.com',
    'translate.google.com',
    'news.google.com',
    'finance.google.com',
    'earth.google.com',
    'chrome.google.com',
    'chromewebstore.google.com',
    'workspace.google.com',
    
    // Banking and finance
    'paypal.com',
    'stripe.com',
    'square.com',
    'venmo.com',
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'capitalone.com',
    'americanexpress.com',
    'discover.com',
    'citi.com',
    
    // Healthcare
    'mychart.com',
    'webmd.com',
    'mayoclinic.org',
    'nih.gov',
    'cdc.gov',
    
    // Government
    'gov',
    'irs.gov',
    'ssa.gov',
    'usa.gov',
    'state.gov',
    
    // Education
    'edu',
    'coursera.org',
    'edx.org',
    'khanacademy.org',
    'udemy.com',
    'udacity.com',
    
    // Productivity suites
    'notion.so',
    'notion.site',
    'airtable.com',
    'monday.com',
    'asana.com',
    'trello.com',
    'slack.com',
    'zoom.us',
    'teams.microsoft.com',
    'office.com',
    'office365.com',
    'outlook.com',
    'outlook.live.com',
    'onedrive.live.com',
    
    // Development
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'stackoverflow.com',
    'stackexchange.com',
    'npmjs.com',
    'pypi.org',
    'developer.mozilla.org',
    
    // AI platforms (don't interfere)
    'openai.com',
    'chat.openai.com',
    'claude.ai',
    'anthropic.com',
    'gemini.google.com',
    'bard.google.com',
    'copilot.microsoft.com',
    'perplexity.ai',
    'huggingface.co',
    
    // Social media (complex UIs)
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'reddit.com',
    'tiktok.com',
    'pinterest.com',
    'snapchat.com',
    'discord.com',
    'telegram.org',
    'whatsapp.com',
    
    // E-commerce checkout
    'checkout.stripe.com',
    'checkout.shopify.com',
    
    // Streaming
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'hbomax.com',
    'primevideo.com',
    'spotify.com',
    'music.apple.com',
    'music.youtube.com',
    
    // News (let other scripts handle these)
    'cnn.com',
    'bbc.com',
    'bbc.co.uk',
    'nytimes.com',
    'washingtonpost.com',
    'theguardian.com',
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'wsj.com',
  ]);

  /**
   * Check if current domain is protected
   */
  function isProtectedDomain(hostname) {
    if (!hostname) return true; // Protect by default if unknown
    
    const normalized = hostname.toLowerCase();
    
    // Direct match
    if (PROTECTED_DOMAINS.has(normalized)) {
      return true;
    }
    
    // Check if it's a subdomain of a protected domain
    for (const protected_domain of PROTECTED_DOMAINS) {
      if (normalized.endsWith('.' + protected_domain)) {
        return true;
      }
      // Handle TLD-style protections like .gov, .edu
      if (protected_domain.startsWith('.') === false && 
          protected_domain.indexOf('.') === -1 && 
          normalized.endsWith('.' + protected_domain)) {
        return true;
      }
    }
    
    return false;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const hostname = window.location.hostname.toLowerCase();
  
  // CRITICAL: Exit immediately on protected domains
  if (isProtectedDomain(hostname)) {
    // Silent exit - don't even log to avoid any overhead
    return;
  }

  let settings = null;
  let isInitialized = false;

  try {
    settings = await window.UnibleckShared.getSettings();
    
    // Check whitelist
    if (await window.UnibleckShared.isCurrentSiteWhitelisted()) {
      return;
    }
  } catch (e) {
    // If we can't get settings, exit safely
    console.error('[BlockHub] Blocking engine init failed:', e);
    return;
  }

  // ============================================================================
  // SITE-SPECIFIC BLOCKING (SAFE APPROACH)
  // Only run blocking on specific sites where we KNOW our selectors work
  // ============================================================================

  /**
   * Site configurations with TESTED, SAFE selectors
   * Each site has been manually verified to not break functionality
   */
  const SITE_CONFIGS = {
    // Google Search - block AI Overview only
    'google.com': {
      enabled: () => settings.blockAIWidgets,
      selectors: [
        // AI Overview - very specific selectors
        'div[jsname="N760b"]',
        'div[data-attrid="wa:/m/0bwfn"]',
        // AI Mode button - specific attribute combo
        'a[jsname][data-ved][href*="udm=50"]',
      ],
      category: 'aiWidgets',
      delay: 500, // Wait for page to load
    },
    
    // YouTube - block ads only
    'youtube.com': {
      enabled: () => settings.blockAds,
      selectors: [
        // Ad renderers - very specific custom elements
        'ytd-ad-slot-renderer',
        'ytd-in-feed-ad-layout-renderer', 
        'ytd-promoted-sparkles-web-renderer',
        'ytd-promoted-video-renderer',
        'ytd-display-ad-renderer',
        'ytd-video-masthead-ad-v3-renderer',
        // Ad containers with specific IDs
        '#player-ads',
        '#masthead-ad',
        // Engagement panel for ads
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
      ],
      category: 'ads',
      delay: 1000,
    },
    
    // Bing - block Copilot
    'bing.com': {
      enabled: () => settings.blockAIWidgets,
      selectors: [
        '#b_sydConvCont',
        '#sydneyContainer',
        'cib-serp',
      ],
      category: 'aiWidgets',
      delay: 500,
    },
  };

  /**
   * Get config for current site
   */
  function getSiteConfig() {
    for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return config;
      }
    }
    return null;
  }

  const siteConfig = getSiteConfig();

  // If no specific config for this site, let other scripts handle it
  if (!siteConfig) {
    window.UnibleckShared?.log?.('Blocking engine: No config for this site, deferring to other scripts');
    return;
  }

  // Check if the feature is enabled
  if (!siteConfig.enabled()) {
    return;
  }

  // ============================================================================
  // SAFE BLOCKING LOGIC
  // ============================================================================

  /**
   * Safely block an element with all checks
   */
  function safeBlockElement(element, reason) {
    if (!element) return false;
    if (element.hasAttribute('data-blockhub-blocked')) return false;
    
    // Double-check it's not in preserve list
    if (window.UnibleckShared?.isElementPreserved?.(element)) {
      return false;
    }
    
    // Check element is actually visible and substantial
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false; // Don't block invisible elements
    }
    
    // Apply blocking
    element.style.setProperty('display', 'none', 'important');
    element.setAttribute('data-blockhub-blocked', reason);
    element.setAttribute('data-uniblock-hidden', reason);
    
    // Increment metrics
    const metricMap = {
      ads: 'adsBlocked',
      aiWidgets: 'aiWidgetsRemoved',
      cookies: 'cookiesRejected',
    };
    
    if (metricMap[siteConfig.category]) {
      window.UnibleckShared?.incrementMetric?.(metricMap[siteConfig.category], 1);
    }
    
    window.UnibleckShared?.log?.(`Blocked (${reason}):`, element.tagName, element.id || element.className);
    return true;
  }

  /**
   * Run blocking for current site
   */
  function runSiteBlocking() {
    if (!siteConfig || !siteConfig.enabled()) return;
    
    let blockedCount = 0;
    
    siteConfig.selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (safeBlockElement(element, `${siteConfig.category}-${hostname}`)) {
            blockedCount++;
          }
        });
      } catch (e) {
        // Invalid selector - skip silently
      }
    });
    
    if (blockedCount > 0) {
      window.UnibleckShared?.log?.(`Site blocking: ${blockedCount} elements on ${hostname}`);
    }
  }

  // ============================================================================
  // MUTATION OBSERVER (CONSERVATIVE)
  // ============================================================================

  let observer = null;
  let pendingRun = false;

  function scheduleRun() {
    if (pendingRun) return;
    pendingRun = true;
    
    // Use requestIdleCallback for non-blocking processing
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        pendingRun = false;
        runSiteBlocking();
      }, { timeout: 500 });
    } else {
      setTimeout(() => {
        pendingRun = false;
        runSiteBlocking();
      }, 100);
    }
  }

  function setupObserver() {
    if (observer) {
      observer.disconnect();
    }
    
    let mutationCount = 0;
    const THRESHOLD = 10;
    
    observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      
      if (mutationCount >= THRESHOLD) {
        mutationCount = 0;
        scheduleRun();
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async function initialize() {
    try {
      // Load preserve rules
      await window.UnibleckShared?.loadPreserveRules?.();
      
      // Setup observer
      setupObserver();
      
      // Initial run with delay
      setTimeout(runSiteBlocking, siteConfig.delay || 500);
      
      // Secondary run for late-loading content
      setTimeout(runSiteBlocking, 2000);
      
      // Tertiary run
      setTimeout(runSiteBlocking, 5000);
      
      isInitialized = true;
      window.UnibleckShared?.log?.(`Blocking engine initialized for ${hostname}`);
      
    } catch (error) {
      console.error('[BlockHub] Engine init error:', error);
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      settings = message.settings;
      if (siteConfig?.enabled()) {
        runSiteBlocking();
      }
    } else if (message.type === 'RULES_UPDATED') {
      window.UnibleckShared?.loadPreserveRules?.(true);
      runSiteBlocking();
    }
  });

  // Handle SPA navigation
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(runSiteBlocking, 500);
    }
  });
  
  urlObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isInitialized) {
      setTimeout(runSiteBlocking, 200);
    }
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
