/**
 * Uniblock Ad Overlay & Floating Ad Blocker
 * 
 * Detects and blocks floating/overlay advertisements that appear:
 * - In front of text or images
 * - Floating on the side of the screen
 * - At the top or bottom of the page
 * - As squares, banners, or columns
 * 
 * This complements the DNR rules by catching ads that are injected via JavaScript
 * and positioned over content.
 */

const PROTECTED_PRODUCTIVITY_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'news.google.com',
  'mail.google.com',
  'chat.google.com',
  'workspace.google.com',
  'accounts.google.com',
  'docs.google.com',
  'drive.google.com',
  'calendar.google.com',
  'meet.google.com',
  'keep.google.com',
  'lens.google.com',
  'chat.openai.com',
  'platform.openai.com',
  'claude.ai',
  'poe.com',
  'notion.so',
  'notion.site',
  'slack.com',
  'teams.microsoft.com',
  'outlook.office.com',
  'office.com',
  'mail.proton.me',
  'app.asana.com',
  'trello.com'
]);

const PROTECTED_PRODUCTIVITY_SUFFIXES = [
  '.google.com',
  '.googleusercontent.com',
  '.gstatic.com'
];

function isProtectedProductivityHost(hostname) {
  if (!hostname) {
    return false;
  }
  const normalized = hostname.toLowerCase();
  if (PROTECTED_PRODUCTIVITY_HOSTS.has(normalized)) {
    return true;
  }
  return PROTECTED_PRODUCTIVITY_SUFFIXES.some((suffix) => {
    const bareSuffix = suffix.startsWith('.') ? suffix.substring(1) : suffix;
    return normalized === bareSuffix || normalized.endsWith(suffix);
  });
}

(async function() {
  'use strict';

  // Check if feature is enabled and site is not whitelisted
  const settings = await window.UnibleckShared.getSettings();
  if (!settings.blockAds || await window.UnibleckShared.isCurrentSiteWhitelisted()) {
    return;
  }

  const currentHost = window.location.hostname;
  if (isProtectedProductivityHost(currentHost)) {
    window.UnibleckShared.log(`Ad overlay blocker skipped on protected domain: ${currentHost}`);
    return;
  }

  /**
   * Selectors for common ad containers and overlay elements
   * These are elements that frequently contain floating/overlay ads
   */
  const AD_OVERLAY_SELECTORS = [
    // Generic ad containers
    '[id*="ad-" i]', '[id*="ads-" i]', '[id*="_ad_" i]',
    '[class*="ad-" i]', '[class*="ads-" i]', '[class*="_ad_" i]',
    '[id*="advertisement" i]', '[class*="advertisement" i]',
    '[id*="advert" i]', '[class*="advert" i]',
    '[id*="sponsor" i]', '[class*="sponsor" i]',
    '[id*="banner" i]', '[class*="banner" i]',
    
    // Floating/sticky ads
    '[id*="sticky" i][id*="ad" i]', '[class*="sticky" i][class*="ad" i]',
    '[id*="float" i][id*="ad" i]', '[class*="float" i][class*="ad" i]',
    '[id*="fixed" i][id*="ad" i]', '[class*="fixed" i][class*="ad" i]',
    
    // Overlay/modal ads
    '[id*="overlay" i][id*="ad" i]', '[class*="overlay" i][class*="ad" i]',
    '[id*="modal" i][id*="ad" i]', '[class*="modal" i][class*="ad" i]',
    '[id*="popup" i][id*="ad" i]', '[class*="popup" i][class*="ad" i]',
    
    // Interstitial ads
    '[id*="interstitial" i]', '[class*="interstitial" i]',
    
    // Common ad network containers
    '[id*="google_ads" i]', '[class*="google_ads" i]',
    '[id*="doubleclick" i]', '[class*="doubleclick" i]',
    '[id*="taboola" i]', '[class*="taboola" i]',
    '[id*="outbrain" i]', '[class*="outbrain" i]',
    
    // Specific ad formats
    'ins.adsbygoogle',
    'iframe[id*="google_ads" i]',
    'iframe[src*="doubleclick" i]',
    'iframe[src*="googlesyndication" i]'
  ];

  /**
   * Check if element is a floating/overlay ad based on position and z-index
   * CRITICAL: Detects ads that appear in front of content
   * @param {Element} element - Element to check
   * @returns {boolean} True if appears to be a floating/overlay ad
   */
  function isFloatingOverlayAd(element) {
    if (!element || !window.UnibleckShared.isElementVisible(element)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    // Must be positioned (fixed or absolute)
    const position = style.position;
    if (position !== 'fixed' && position !== 'absolute') {
      return false;
    }

    // Must have elevated z-index (appears over content)
    const zIndex = parseInt(style.zIndex, 10);
    if (isNaN(zIndex) || zIndex < 100) {
      return false;
    }

    // Must be visible and have reasonable size
    if (rect.width < 50 || rect.height < 50) {
      return false;
    }

    // Check if it's positioned at edges (common for floating ads)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Top edge (banner ads)
    const isTopBanner = rect.top < 100 && rect.width > viewportWidth * 0.5;
    
    // Bottom edge (banner ads)
    const isBottomBanner = rect.bottom > viewportHeight - 100 && rect.width > viewportWidth * 0.5;
    
    // Side edges (column ads)
    const isLeftColumn = rect.left < 200 && rect.height > 300;
    const isRightColumn = rect.right > viewportWidth - 200 && rect.height > 300;
    
    // Center overlay (interstitial ads)
    const isCenterOverlay = rect.width > viewportWidth * 0.3 && 
                            rect.height > viewportHeight * 0.3 &&
                            zIndex > 1000;

    return isTopBanner || isBottomBanner || isLeftColumn || isRightColumn || isCenterOverlay;
  }

  /**
   * Check if element contains ad-related text or attributes
   * @param {Element} element - Element to check
   * @returns {boolean} True if contains ad indicators
   */
  function hasAdIndicators(element) {
    // Check ID and class names
    const id = (element.id || '').toLowerCase();
    const className = (element.className || '').toString().toLowerCase();
    
    const adKeywords = [
      'advertisement', 'advert', 'ad-', 'ads-', '_ad_', 
      'sponsor', 'promo', 'banner', 'popup', 'overlay',
      'google_ads', 'doubleclick', 'adsense'
    ];

    const hasAdInIdOrClass = adKeywords.some(keyword => 
      id.includes(keyword) || className.includes(keyword)
    );

    // Check data attributes
    const hasAdDataAttr = Array.from(element.attributes).some(attr => 
      attr.name.toLowerCase().includes('ad') && 
      attr.value.toLowerCase().includes('ad')
    );

    // Check if contains iframe with ad source
    const hasAdIframe = element.querySelector('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="advertising"]');

    return hasAdInIdOrClass || hasAdDataAttr || !!hasAdIframe;
  }

  /**
   * Block an ad overlay element
   * @param {Element} element - Element to block
   * @param {string} reason - Reason for blocking
   */
  function blockAdOverlay(element, reason = 'ad-overlay') {
    if (!element || element.hasAttribute('data-uniblock-hidden')) {
      return;
    }

    if (window.UnibleckShared.isElementPreserved(element)) {
      window.UnibleckShared.log(`Preserve-list override prevented ad overlay hide (${reason})`);
      return;
    }

    window.UnibleckShared.hideElement(element, reason);
    window.UnibleckShared.incrementMetric('adsBlocked', 1);
    window.UnibleckShared.log(`Blocked ad overlay (${reason}):`, element);
  }

  /**
   * Scan page for floating/overlay ads and block them
   * CRITICAL: Aggressively detects ads that appear over content
   */
  function scanAndBlockAdOverlays() {
    let blockedCount = 0;

    // 1. Block by selectors
    AD_OVERLAY_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!element.hasAttribute('data-uniblock-hidden')) {
            // Additional check: must be floating/overlay positioned
            if (isFloatingOverlayAd(element)) {
              blockAdOverlay(element, 'selector-floating');
              blockedCount++;
            }
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });

    // 2. Scan all fixed/absolute positioned elements
    const positionedElements = document.querySelectorAll('[style*="fixed"], [style*="absolute"]');
    positionedElements.forEach(element => {
      if (element.hasAttribute('data-uniblock-hidden')) return;

      // Check if it's a floating ad
      if (isFloatingOverlayAd(element) && hasAdIndicators(element)) {
        blockAdOverlay(element, 'positioned-ad');
        blockedCount++;
      }
    });

    // 3. Check for elements with high z-index that might be ads
    const allElements = document.querySelectorAll('div, aside, section, article');
    allElements.forEach(element => {
      if (element.hasAttribute('data-uniblock-hidden')) return;

      const style = window.getComputedStyle(element);
      const zIndex = parseInt(style.zIndex, 10);

      // High z-index + ad indicators = likely ad overlay
      if (zIndex > 500 && hasAdIndicators(element) && isFloatingOverlayAd(element)) {
        blockAdOverlay(element, 'high-zindex-ad');
        blockedCount++;
      }
    });

    if (blockedCount > 0) {
      window.UnibleckShared.log(`Blocked ${blockedCount} ad overlays`);
    }

    return blockedCount;
  }

  /**
   * Throttled scan function
   * CRITICAL: Throttled to prevent performance issues
   */
  const throttledScan = window.UnibleckShared.throttle(scanAndBlockAdOverlays, 1000);

  /**
   * Set up MutationObserver to watch for dynamically added ad overlays
   * CRITICAL: Watches for new fixed/absolute positioned elements
   * IMPORTANT: Observer can be disconnected when feature is disabled
   */
  let observer = null;
  
  function setupObserver() {
    // CRITICAL: Check if feature is still enabled before setting up observer
    if (!settings.blockAds) {
      window.UnibleckShared.log('Ad overlay observer: Feature disabled, not starting');
      return;
    }
    
    let mutationCount = 0;
    const MUTATION_THRESHOLD = 15; // Process after 15 mutations

    observer = new MutationObserver((mutations) => {
      // CRITICAL: Check if feature is still enabled before processing
      if (!settings.blockAds) {
        if (observer) {
          observer.disconnect();
          observer = null;
          window.UnibleckShared.log('Ad overlay observer: Feature disabled, disconnecting');
        }
        return;
      }
      
      mutationCount += mutations.length;

      if (mutationCount < MUTATION_THRESHOLD) {
        return;
      }

      mutationCount = 0;
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if added element is positioned or contains iframes
              const style = window.getComputedStyle(node);
              if (style.position === 'fixed' || style.position === 'absolute' || 
                  node.querySelector('iframe')) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
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

    window.UnibleckShared.log('Ad overlay observer initialized');
  }
  
  /**
   * Clean up observer when feature is disabled
   * CRITICAL: Ensures observer stops when user turns off ad blocking
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
      window.UnibleckShared.log('Ad overlay observer: Cleaned up');
    }
  }
  
  // Listen for settings changes to stop observer if feature is disabled
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings && !newSettings.blockAds) {
        cleanup();
      }
    }
  });

  // Initialize
  await window.UnibleckShared.waitForDOMReady();
  await window.UnibleckShared.loadPreserveRules();

  // Initial scan - delayed to not interfere with page load
  setTimeout(scanAndBlockAdOverlays, 1500);

  // Scan again after content loads
  setTimeout(scanAndBlockAdOverlays, 4000);

  // Set up observer for dynamic ads
  setupObserver();

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'RULES_UPDATED' && message.category === 'preserveList') {
      window.UnibleckShared.loadPreserveRules(true).catch((error) => window.UnibleckShared.logError('Failed to reload preserve list', error));
    }
  });

  window.UnibleckShared.log('Ad overlay blocker initialized');
})();

