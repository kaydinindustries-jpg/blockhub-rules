/**
 * BlockHub AI Widget Blocker
 * 
 * Detects and blocks AI chat widgets, assistants, and invite-to-AI popups.
 * Uses selector-based detection, text heuristics, and visual pattern matching.
 * Supports multilingual AI widget patterns.
 */

(async function() {
  'use strict';

  // Check if feature is enabled and site is not whitelisted
  let settings = await window.UnibleckShared.getSettings();
  if (!settings.blockAIWidgets || await window.UnibleckShared.isCurrentSiteWhitelisted()) {
    return;
  }

  /**
   * Domains where AI widget blocker should NEVER run
   * Includes Google services, productivity tools, and sites where blocking would break functionality
   * CRITICAL: This prevents breaking legitimate site features
   */
  const EXCLUDED_DOMAINS = [
    // Google services (all) - don't interfere with ANY Google functionality
    'google.com', 'google.fr', 'google.de', 'google.es', 'google.it', 'google.co.uk',
    'gmail.com', 'docs.google.com', 'drive.google.com', 'sheets.google.com',
    'slides.google.com', 'calendar.google.com', 'meet.google.com',
    'youtube.com', 'youtu.be',
    'accounts.google.com', 'myaccount.google.com',
    
    // Chrome-specific (CRITICAL: don't block Chrome UI elements)
    'chrome.google.com', 'chromewebstore.google.com',
    
    // AI platforms (these ARE AI tools, don't block them)
    'openai.com', 'chat.openai.com', 'platform.openai.com',
    'anthropic.com', 'claude.ai',
    'bard.google.com', 'gemini.google.com',
    'copilot.microsoft.com', 'github.com/copilot',
    'midjourney.com', 'stability.ai',
    'huggingface.co', 'replicate.com',
    'perplexity.ai', 'character.ai',
    'jasper.ai', 'copy.ai', 'writesonic.com',
    
    // Productivity & work tools
    'slack.com', 'teams.microsoft.com',
    'trello.com', 'asana.com', 'monday.com',
    'airtable.com', 'coda.io',
    'figma.com', 'miro.com',
    'dropbox.com', 'box.com',
    
    // Microsoft services
    'microsoft.com', 'office.com', 'office365.com',
    'onedrive.live.com', 'outlook.com', 'outlook.live.com',
    
    // Development & documentation
    'github.com', 'gitlab.com', 'bitbucket.org',
    'stackoverflow.com', 'stackexchange.com',
    'developer.mozilla.org', 'w3schools.com',
    
    // Cloud platforms
    'aws.amazon.com', 'console.aws.amazon.com',
    'cloud.google.com', 'console.cloud.google.com',
    'azure.microsoft.com', 'portal.azure.com',
    
    // Communication
    'zoom.us', 'webex.com', 'discord.com',
    'telegram.org', 'whatsapp.com'
  ];

  /**
   * Check if current domain should be excluded from AI widget blocking
   */
  const hostname = window.location.hostname.toLowerCase();
  const isExcluded = EXCLUDED_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (isExcluded) {
    window.UnibleckShared.log(`Skipping AI widgets on excluded domain: ${hostname}`);
    return;
  }

  let AI_WIDGET_SELECTORS = [];
  let AI_TEXT_PATTERNS = [];

  function normalizePatternText(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  async function loadAiWidgetRules(forceRefresh = false) {
    try {
      const rules = await window.UnibleckShared.getRuleSet('aiWidgetSelectors', { forceRefresh });

      if (!rules) {
        AI_WIDGET_SELECTORS = [];
        AI_TEXT_PATTERNS = [];
        PLATFORM_SELECTORS = {};
        return;
      }

      AI_WIDGET_SELECTORS = Array.isArray(rules.selectors) ? rules.selectors : [];

      const patternSet = new Set();
      const textPatterns = rules.text_patterns && typeof rules.text_patterns === 'object'
        ? rules.text_patterns
        : {};

      Object.values(textPatterns).forEach(patternList => {
        if (Array.isArray(patternList)) {
          patternList.forEach(pattern => {
            const normalized = normalizePatternText(pattern);
            if (normalized) {
              patternSet.add(normalized);
            }
          });
        }
      });

      AI_TEXT_PATTERNS = Array.from(patternSet);

      window.UnibleckShared.log(
        `AI widget rules loaded: ${AI_WIDGET_SELECTORS.length} selectors, ${AI_TEXT_PATTERNS.length} text patterns`
      );
    } catch (error) {
      window.UnibleckShared.logError('Failed to load AI widget rule set', error);
      AI_WIDGET_SELECTORS = [];
      AI_TEXT_PATTERNS = [];
    }
  }

  await loadAiWidgetRules();

  if (AI_WIDGET_SELECTORS.length === 0 && AI_TEXT_PATTERNS.length === 0) {
    window.UnibleckShared.log('AI widget rules are empty, skipping widget blocker');
    return;
  }

  /**
   * Check if element text matches AI patterns
   * CRITICAL: More strict matching to avoid false positives that break sites
   * @param {Element} element - Element to check
   * @returns {boolean} True if matches AI pattern
   */
  function matchesAIPattern(element) {
    if (!element) return false;
    if (AI_TEXT_PATTERNS.length === 0) return false;
    
    // Get all text content
    const text = (element.textContent || '').toLowerCase().trim();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const title = (element.getAttribute('title') || '').toLowerCase();
    const allText = `${text} ${ariaLabel} ${title}`;
    
    // CRITICAL: Must be substantial text (>20 chars) to avoid false positives
    if (allText.length < 20) return false;
    
    // CRITICAL: Must match at least 2 patterns to be considered AI widget (more strict)
    let matchCount = 0;
    for (const pattern of AI_TEXT_PATTERNS) {
      if (allText.includes(pattern)) {
        matchCount++;
        if (matchCount >= 2) return true;
      }
    }
    
    return false;
  }

  /**
   * Check if element is a fixed overlay (potential AI popup)
   * CRITICAL: More strict criteria to avoid blocking legitimate overlays (modals, menus, etc.)
   * @param {Element} element - Element to check
   * @returns {boolean} True if appears to be a fixed overlay
   */
  function isFixedOverlay(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Check if fixed/absolute positioned
    if (style.position !== 'fixed' && style.position !== 'absolute') {
      return false;
    }
    
    // CRITICAL: Must have VERY high z-index (>9000) to be considered AI widget overlay
    // This prevents blocking legitimate site modals/menus
    const zIndex = parseInt(style.zIndex, 10);
    if (isNaN(zIndex) || zIndex < 9000) {
      return false;
    }
    
    // CRITICAL: Must be small corner widget (not full-screen modals)
    // This prevents breaking site functionality
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const coverageX = rect.width / viewportWidth;
    const coverageY = rect.height / viewportHeight;
    
    // Only match small corner widgets (< 30% of viewport)
    const isSmallWidget = coverageX < 0.3 && coverageY < 0.3 && 
                          rect.width > 200 && rect.height > 200;
    
    return isSmallWidget;
  }

  /**
   * Check if element is a dialog with AI content
   * @param {Element} element - Element to check
   * @returns {boolean} True if is AI dialog
   */
  function isAIDialog(element) {
    if (!element) return false;
    
    const role = element.getAttribute('role');
    const ariaModal = element.getAttribute('aria-modal');
    
    // Check if it's a dialog/modal
    if (role === 'dialog' || role === 'alertdialog' || ariaModal === 'true') {
      // Check if contains AI-related content
      return matchesAIPattern(element);
    }
    
    return false;
  }

  /**
   * Block/hide an AI widget element
   * @param {Element} element - Element to block
   * @param {string} reason - Reason for blocking
   */
  function blockAIWidget(element, reason = 'ai-widget') {
    if (!element || element.hasAttribute('data-uniblock-hidden')) {
      return;
    }
    
    window.UnibleckShared.hideElement(element, reason);
    window.UnibleckShared.incrementMetric('aiWidgetsRemoved', 1);
    window.UnibleckShared.log(`Blocked AI widget (${reason}):`, element);
  }

  /**
   * Scan page for AI widgets and block them
   * CRITICAL: Much more conservative approach to prevent breaking sites
   */
  function scanAndBlockAIWidgets() {
    let blockedCount = 0;
    
    // 1. Block ONLY by very specific selectors (most reliable)
    // CRITICAL: Reduced selector list to only the most specific, reliable ones
    const SAFE_SELECTORS = AI_WIDGET_SELECTORS.length ? AI_WIDGET_SELECTORS : [];
    
    SAFE_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!element.hasAttribute('data-uniblock-hidden') && window.UnibleckShared.isElementVisible(element)) {
            blockAIWidget(element, 'selector-match');
            blockedCount++;
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });
    
    // 2. REMOVED: Dialog checking (too aggressive, breaks sites)
    // 3. REMOVED: Fixed overlay checking (too aggressive, breaks sites)
    // 4. REMOVED: Button/link checking (too aggressive, breaks sites)
    
    // CRITICAL: Only use the most reliable, specific selectors
    // This prevents breaking CNN and other news sites
    
    if (blockedCount > 0) {
      window.UnibleckShared.log(`Blocked ${blockedCount} AI widgets (conservative mode)`);
    }
    
    return blockedCount;
  }

  /**
   * Throttled scan function
   * CRITICAL: Increased throttle to 1000ms to prevent excessive scanning
   */
  const throttledScan = window.UnibleckShared.throttle(scanAndBlockAIWidgets, 1000);

  /**
   * Set up MutationObserver to watch for dynamically added AI widgets
   * CRITICAL: Much more conservative to prevent performance issues
   * IMPORTANT: Observer can be disconnected when feature is disabled
   */
  let observer = null;
  
  function setupObserver() {
    // CRITICAL: Check if feature is still enabled before setting up observer
    if (!settings.blockAIWidgets) {
      window.UnibleckShared.log('AI widget observer: Feature disabled, not starting');
      return;
    }
    
    let mutationCount = 0;
    const MUTATION_THRESHOLD = 20; // Only process after 20 mutations (very conservative)
    
    observer = new MutationObserver((mutations) => {
      // CRITICAL: Check if feature is still enabled before processing
      if (!settings.blockAIWidgets) {
        if (observer) {
          observer.disconnect();
          observer = null;
          window.UnibleckShared.log('AI widget observer: Feature disabled, disconnecting');
        }
        return;
      }
      
      mutationCount += mutations.length;
      
      // Only process if we've accumulated enough mutations
      if (mutationCount < MUTATION_THRESHOLD) {
        return;
      }
      
      mutationCount = 0;
      
      let shouldScan = false;
      
      // CRITICAL: Only check for iframes (most reliable AI widget indicator)
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Only scan if an iframe was added (most reliable indicator)
              if (node.tagName === 'IFRAME' || node.querySelector('iframe')) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }
      
      if (shouldScan) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          window.UnibleckShared.executeWhenIdle(throttledScan);
        });
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    window.UnibleckShared.log('AI widget observer initialized (conservative mode)');
  }
  
  /**
   * Clean up observer when feature is disabled
   * CRITICAL: Ensures observer stops when user turns off AI widget blocking
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
      window.UnibleckShared.log('AI widget observer: Cleaned up');
    }
  }
  
  // Listen for settings changes to stop observer if feature is disabled
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings) {
        settings = newSettings;
      }
      if (newSettings && !newSettings.blockAIWidgets) {
        cleanup();
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      const previousState = settings.blockAIWidgets;
      settings = message.settings;

      if (!settings.blockAIWidgets) {
        cleanup();
      } else if (!previousState && settings.blockAIWidgets) {
        // Feature re-enabled: resume scanning/observer
        scanAndBlockAIWidgets();
        if (!observer) {
          setupObserver();
        }
      }
    } else if (message.type === 'RULES_UPDATED' && message.category === 'aiWidgetSelectors') {
      (async () => {
        await loadAiWidgetRules(true);

        if (!settings.blockAIWidgets) {
          return;
        }

        if (AI_WIDGET_SELECTORS.length === 0 && AI_TEXT_PATTERNS.length === 0) {
          window.UnibleckShared.log('Updated AI widget rules are empty, stopping observer');
          cleanup();
          return;
        }

        scanAndBlockAIWidgets();
        window.UnibleckShared.log('AI widget rules refreshed from background update');
      })();
    }
  });

  /**
   * Handle Shadow DOM
   * Patch attachShadow to intercept shadow roots
   */
  function setupShadowDOMHandling() {
    const originalAttachShadow = Element.prototype.attachShadow;
    
    Element.prototype.attachShadow = function(...args) {
      const shadowRoot = originalAttachShadow.apply(this, args);
      
      // Only handle open shadow roots
      if (args[0] && args[0].mode === 'open') {
        // Scan shadow root after a short delay
        setTimeout(() => {
          try {
            const aiElements = AI_WIDGET_SELECTORS.map(sel => {
              try {
                return Array.from(shadowRoot.querySelectorAll(sel));
              } catch (e) {
                return [];
              }
            }).flat();
            
            aiElements.forEach(element => {
              blockAIWidget(element, 'shadow-dom');
            });
          } catch (e) {
            window.UnibleckShared.logError('Error scanning shadow DOM', e);
          }
        }, 100);
      }
      
      return shadowRoot;
    };
  }

  // Initialize
  await window.UnibleckShared.waitForDOMReady();
  
  // Set up shadow DOM handling
  setupShadowDOMHandling();
  
  // Initial scan - delayed to not interfere with page load
  setTimeout(scanAndBlockAIWidgets, 2000);
  
  // CRITICAL: Reduced scan frequency to prevent performance issues
  // Only scan once more after 5 seconds (most widgets load by then)
  setTimeout(scanAndBlockAIWidgets, 5000);
  
  // Set up observer for dynamic content
  setupObserver();
  
  window.UnibleckShared.log('AI widget blocker initialized (conservative mode)');
})();

