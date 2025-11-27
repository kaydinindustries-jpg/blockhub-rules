/**
 * BlockHub AI Terms Sanitizer
 * 
 * Detects and visually hides AI-related terms from web pages.
 * Supports conservative (long terms only) and aggressive (all terms) modes.
 * Uses TreeWalker for efficient text node processing with performance optimizations.
 */

(async function() {
  'use strict';

  // Check if feature is enabled and site is not whitelisted
  let settings = await window.UnibleckShared.getSettings();
  if (!settings.hideAITerms || await window.UnibleckShared.isCurrentSiteWhitelisted()) {
    return;
  }

  // Check if this is a checkout/payment page (skip to avoid breaking functionality)
  if (window.UnibleckShared.isCheckoutPage()) {
    window.UnibleckShared.log('Skipping AI terms on checkout page');
    return;
  }

  /**
   * Domains where AI terms sanitizer should NEVER run
   * Includes productivity tools, Google services, AI platforms, documentation sites
   */
  const EXCLUDED_DOMAINS = [
    // Google services (all)
    'google.com', 'google.fr', 'google.de', 'google.es', 'google.it', 'google.co.uk',
    'gmail.com', 'docs.google.com', 'drive.google.com', 'sheets.google.com',
    'slides.google.com', 'calendar.google.com', 'meet.google.com',
    'youtube.com', 'youtu.be',
    
    // AI platforms (don't interfere with AI tools)
    'openai.com', 'chat.openai.com', 'platform.openai.com',
    'anthropic.com', 'claude.ai',
    'bard.google.com', 'gemini.google.com',
    'copilot.microsoft.com', 'github.com/copilot',
    'midjourney.com', 'stability.ai',
    'huggingface.co', 'replicate.com',
    'perplexity.ai', 'character.ai',
    'jasper.ai', 'copy.ai', 'writesonic.com',
    
    // Productivity & work tools
    'notion.so', 'notion.site',
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
    'npmjs.com', 'pypi.org',
    
    // Legal & business documents (like lawinsider.com)
    'lawinsider.com', 'justia.com', 'findlaw.com',
    'sec.gov', 'edgar.gov',
    
    // Education platforms
    'coursera.org', 'udemy.com', 'edx.org',
    'khanacademy.org', 'duolingo.com',
    
    // Cloud platforms
    'aws.amazon.com', 'console.aws.amazon.com',
    'cloud.google.com', 'console.cloud.google.com',
    'azure.microsoft.com', 'portal.azure.com',
    
    // Communication
    'zoom.us', 'webex.com', 'discord.com',
    'telegram.org', 'whatsapp.com'
  ];

  /**
   * Check if current domain should be excluded from AI terms processing
   */
  const hostname = window.location.hostname.toLowerCase();
  const isExcluded = EXCLUDED_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (isExcluded) {
    window.UnibleckShared.log(`Skipping AI terms on excluded domain: ${hostname}`);
    return;
  }

  const EMPTY_AI_TERMS = { conservative: [], aggressive: [] };
  let AI_TERMS = EMPTY_AI_TERMS;

  async function loadAiTermRules(forceRefresh = false) {
    try {
      const rules = await window.UnibleckShared.getRuleSet('aiTerms', { forceRefresh });

      if (rules) {
        AI_TERMS = {
          conservative: Array.isArray(rules.conservative) ? rules.conservative : [],
          aggressive: Array.isArray(rules.aggressive) ? rules.aggressive : []
        };
      } else {
        AI_TERMS = EMPTY_AI_TERMS;
      }
    } catch (error) {
      window.UnibleckShared.logError('Failed to load AI terms rule set', error);
      AI_TERMS = EMPTY_AI_TERMS;
    }
  }

  /**
   * Stoplist - words containing AI/IA that are NOT AI-related
   */
  const STOPLIST = new Set([
    'mail', 'email', 'e-mail', 'gmail', 'emails', 'mailing', 'mailed', 'mailer', 'mailbox',
    'rail', 'railroad', 'railway', 'rails', 'railing', 'derail', 'monorail',
    'tail', 'tails', 'tailed', 'tailing',
    'detail', 'details', 'detailed', 'detailing',
    'retail', 'retailer', 'retailing',
    'bail', 'bailed', 'bailing', 'bailout',
    'jail', 'jailed', 'jailing', 'jailer',
    'sail', 'sailed', 'sailing', 'sailor', 'sailboat',
    'trail', 'trails', 'trailed', 'trailing', 'trailer',
    'snail', 'snails',
    'nail', 'nails', 'nailed', 'nailing',
    'fail', 'fails', 'failed', 'failing', 'failure',
    'hail', 'hailed', 'hailing', 'hailstone',
    'avail', 'available', 'availability',
    'prevail', 'prevailed', 'prevailing',
    'entail', 'entails', 'entailed', 'entailing',
    'curtail', 'curtailed', 'curtailing',
    'cocktail', 'cocktails',
    'waist', 'waistline',
    'wait', 'waiter', 'waiting', 'waited',
    'await', 'awaited', 'awaiting', 'awaits',
    'pain', 'painful', 'pains', 'pained', 'painkiller',
    'main', 'mainly', 'mainland', 'mainstream', 'maintain', 'maintained', 'maintaining', 'maintenance',
    'gain', 'gained', 'gaining', 'gains',
    'again', 'against',
    'rain', 'rained', 'raining', 'rains', 'rainy', 'rainbow', 'rainfall',
    'train', 'trained', 'training', 'trainer', 'trains',
    'strain', 'strained', 'straining', 'strains',
    'drain', 'drained', 'draining', 'drains', 'drainage',
    'brain', 'brains', 'brainstorm',
    'grain', 'grains', 'grainy',
    'chain', 'chains', 'chained', 'chaining',
    'plain', 'plains', 'plainly',
    'explain', 'explained', 'explaining', 'explains', 'explanation',
    'complain', 'complained', 'complaining', 'complains', 'complaint',
    'ail', 'ails', 'ailed', 'ailing', 'ailment',
    'travail', 'détail', 'émail', 'baile', 'maíz', 'aglio', 'dettaglio', 'detalhe',
    // Proper nouns
    'maia', 'gaia', 'kaia', 'raia', 'laila', 'kaila', 'naia', 'zaia', 'baia', 'daia',
    'faia', 'haia', 'jaia', 'laia', 'paia', 'saia', 'taia', 'vaia', 'waia', 'xaia', 'yaia',
    // Air-related
    'air', 'aircraft', 'airline', 'airport', 'airplane', 'airborne', 'aired', 'airing', 'airs', 'airy',
    'fair', 'fairly', 'fairness', 'unfair', 'affair', 'affairs',
    'hair', 'hairy', 'haircut', 'hairstyle',
    'pair', 'pairs', 'paired', 'pairing',
    'repair', 'repaired', 'repairing', 'repairs',
    'chair', 'chairs', 'chairman', 'wheelchair',
    'stair', 'stairs', 'staircase', 'stairway',
    'dairy', 'dairies',
    'fairy', 'fairies', 'fairytale',
    'prairie', 'prairies'
  ]);

  /**
   * Elements to skip (never process text inside these)
   */
  const SKIP_ELEMENTS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
    'CODE', 'PRE', 'SAMP', 'KBD', 'VAR',
    'SVG', 'MATH', 'CANVAS'
  ]);

  /**
   * Build regex pattern from terms
   */
  let termsRegex = null;
  let currentMode = settings.aiTermsMode || 'conservative';

  await loadAiTermRules();

  if (!AI_TERMS.conservative.length) {
    window.UnibleckShared.log('AI terms rule set is empty, skipping sanitizer');
    return;
  }

  function buildRegex() {
    const mode = currentMode;
    let terms = [...AI_TERMS.conservative];
    
    if (mode === 'aggressive') {
      terms = [...terms, ...AI_TERMS.aggressive];
    }
    
    // Sort by length (longest first) to match longer terms first
    terms.sort((a, b) => b.length - a.length);
    
    // Escape special regex characters
    const escapedTerms = terms.map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    // Build regex with word boundaries
    termsRegex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
    
    window.UnibleckShared.log(`Built regex with ${terms.length} terms (${mode} mode)`);
  }

  buildRegex();

  /**
   * Check if a word is in the stoplist
   * @param {string} word - Word to check
   * @returns {boolean} True if in stoplist
   */
  function isStopword(word) {
    return STOPLIST.has(word.toLowerCase());
  }

  /**
   * Check if element should be skipped
   * @param {Element} element - Element to check
   * @returns {boolean} True if should skip
   */
  function shouldSkipElement(element) {
    if (!element) return true;
    
    // Skip certain element types
    if (SKIP_ELEMENTS.has(element.tagName)) return true;
    
    // Skip contenteditable elements
    if (element.isContentEditable) return true;
    
    // Skip if already processed
    if (element.hasAttribute('data-uniblock-processed')) return true;
    
    // Skip links (preserve anchor text for SEO and navigation)
    if (element.tagName === 'A') return true;
    
    // Skip if parent is a link
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'A') return true;
      if (SKIP_ELEMENTS.has(parent.tagName)) return true;
      parent = parent.parentElement;
    }
    
    return false;
  }

  /**
   * Process a text node and hide AI terms
   * @param {Text} textNode - Text node to process
   * @returns {boolean} True if any terms were hidden
   */
  function processTextNode(textNode) {
    if (!textNode || !textNode.nodeValue) return false;
    
    const parent = textNode.parentElement;
    if (!parent || shouldSkipElement(parent)) return false;
    
    const text = textNode.nodeValue;
    if (text.trim().length < 2) return false;
    
    // Check if text contains any AI terms
    if (!termsRegex.test(text)) return false;
    
    // Reset regex lastIndex
    termsRegex.lastIndex = 0;
    
    let match;
    const matches = [];
    
    // Find all matches
    while ((match = termsRegex.exec(text)) !== null) {
      const matchedText = match[0];
      
      // Skip if it's a stopword
      if (isStopword(matchedText)) continue;
      
      matches.push({
        text: matchedText,
        index: match.index,
        length: matchedText.length
      });
    }
    
    if (matches.length === 0) return false;
    
    // Create document fragment with hidden terms
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    for (const match of matches) {
      // Add text before match
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
      }
      
      // Create span for hidden term
      const span = document.createElement('span');
      span.className = 'uniblock-hidden-term';
      span.textContent = match.text;
      span.setAttribute('data-original', match.text);
      span.setAttribute('title', 'Hidden by Uniblock (AI term)');
      fragment.appendChild(span);
      
      lastIndex = match.index + match.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex))
      );
    }
    
    // Replace text node with fragment
    try {
      parent.replaceChild(fragment, textNode);
      parent.setAttribute('data-uniblock-processed', 'true');
      return true;
    } catch (e) {
      window.UnibleckShared.logError('Error replacing text node', e);
      return false;
    }
  }

  /**
   * Walk through text nodes in a root element
   * CRITICAL: Heavily throttled to prevent page saturation and performance issues
   * @param {Element} root - Root element to walk
   * @param {number} budget - Time budget in milliseconds (reduced from 50ms to 30ms)
   * @returns {number} Number of terms hidden
   */
  function walkTextNodes(root, budget = 30) {
    if (!root) return 0;
    
    const startTime = performance.now();
    let hiddenCount = 0;
    let processedNodes = 0;
    const maxNodes = 50; // REDUCED from 100 to 50 nodes per call to prevent saturation
    
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if budget exceeded
          if (performance.now() - startTime > budget) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if max nodes reached
          if (processedNodes >= maxNodes) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip empty or whitespace-only nodes
          if (!node.nodeValue || node.nodeValue.trim().length < 2) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if parent should be skipped
          if (shouldSkipElement(node.parentElement)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let currentNode;
    const nodesToProcess = [];
    
    // Collect nodes first (to avoid issues with DOM modifications during walk)
    while ((currentNode = walker.nextNode()) && processedNodes < maxNodes) {
      nodesToProcess.push(currentNode);
      processedNodes++;
      
      // Check budget
      if (performance.now() - startTime > budget) break;
    }
    
    // Process collected nodes
    for (const node of nodesToProcess) {
      if (processTextNode(node)) {
        hiddenCount++;
      }
      
      // Check budget
      if (performance.now() - startTime > budget) break;
    }
    
    if (hiddenCount > 0) {
      window.UnibleckShared.incrementMetric('aiTermsHidden', hiddenCount);
      window.UnibleckShared.log(`Hidden ${hiddenCount} AI terms (processed ${processedNodes} nodes in ${Math.round(performance.now() - startTime)}ms)`);
    }
    
    return hiddenCount;
  }

  /**
   * Process the entire document
   */
  function processDocument() {
    if (!document.body) return;
    
    window.UnibleckShared.executeWhenIdle(() => {
      walkTextNodes(document.body, 100);
    });
  }

  /**
   * Debounced document processor
   * CRITICAL: Increased debounce from 300ms to 1000ms to prevent excessive processing
   */
  const debouncedProcess = window.UnibleckShared.debounce(processDocument, 1000);

  /**
   * Set up MutationObserver for dynamic content
   * CRITICAL: Heavily throttled to prevent performance issues and page saturation
   * IMPORTANT: Observer can be disconnected when feature is disabled
   */
  let observer = null;
  
  function setupObserver() {
    // CRITICAL: Check if feature is still enabled before setting up observer
    if (!settings.hideAITerms) {
      window.UnibleckShared.log('AI terms observer: Feature disabled, not starting');
      return;
    }
    
    let mutationCount = 0;
    const MUTATION_THRESHOLD = 10; // Only process after 10 mutations accumulated
    
    observer = new MutationObserver((mutations) => {
      // CRITICAL: Check if feature is still enabled before processing
      if (!settings.hideAITerms) {
        if (observer) {
          observer.disconnect();
          observer = null;
          window.UnibleckShared.log('AI terms observer: Feature disabled, disconnecting');
        }
        return;
      }
      
      mutationCount += mutations.length;
      
      // Only process if we've accumulated enough mutations (prevents excessive processing)
      if (mutationCount < MUTATION_THRESHOLD) {
        return;
      }
      
      mutationCount = 0; // Reset counter
      
      let shouldProcess = false;
      
      // Only check first 5 mutations (performance optimization)
      const mutationsToCheck = mutations.slice(0, 5);
      
      for (const mutation of mutationsToCheck) {
        // Skip character data changes (too frequent, causes saturation)
        if (mutation.type === 'characterData') {
          continue;
        }
        
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            // Only process element nodes with substantial text (>100 chars)
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent.trim();
              if (text.length > 100) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        
        if (shouldProcess) break;
      }
      
      if (shouldProcess) {
        debouncedProcess();
      }
    });
    
    // Observe only childList, NOT characterData (prevents saturation)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: false // CRITICAL: Disabled to prevent excessive callbacks
    });
    
    window.UnibleckShared.log('AI terms observer initialized (throttled mode)');
  }
  
  /**
   * Clean up observer when feature is disabled
   * CRITICAL: Ensures observer stops when user turns off AI terms sanitization
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
      window.UnibleckShared.log('AI terms observer: Cleaned up');
    }
  }
  
  // Listen for settings changes to stop observer if feature is disabled
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings) {
        settings = newSettings;
      }
      if (newSettings && !newSettings.hideAITerms) {
        cleanup();
      }
    }
  });

  /**
   * Inject CSS for hidden terms
   */
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .uniblock-hidden-term {
        filter: blur(4px) !important;
        opacity: 0.3 !important;
        cursor: help !important;
        user-select: none !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Reset processed markers and re-run sanitization
   */
  function resetAndReprocess() {
    document.querySelectorAll('[data-uniblock-processed]').forEach(el => {
      el.removeAttribute('data-uniblock-processed');
    });

    document.querySelectorAll('.uniblock-hidden-term').forEach(span => {
      const text = span.getAttribute('data-original') || span.textContent;
      span.replaceWith(document.createTextNode(text));
    });

    processDocument();
  }

  /**
   * Listen for settings updates
   */
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      settings = message.settings;
      const newMode = message.settings.aiTermsMode || 'conservative';
      if (newMode !== currentMode) {
        currentMode = newMode;
        buildRegex();
        window.UnibleckShared.log(`AI terms mode changed to: ${currentMode}`);

        resetAndReprocess();
      }
    } else if (message.type === 'RULES_UPDATED' && message.category === 'aiTerms') {
      (async () => {
        await loadAiTermRules(true);

        if (!AI_TERMS.conservative.length) {
          window.UnibleckShared.log('AI terms rule set became empty after update, stopping sanitizer');
          cleanup();
          return;
        }

        buildRegex();
        resetAndReprocess();
        window.UnibleckShared.log('AI terms rule set refreshed from background update');
      })();
    }
  });

  // Initialize
  await window.UnibleckShared.waitForDOMReady();
  
  // Inject CSS
  injectCSS();
  
  // Initial processing - delayed to not block page load
  setTimeout(() => {
    processDocument();
  }, 2000); // Wait 2 seconds before first processing
  
  // Set up observer for dynamic content
  setupObserver();
  
  window.UnibleckShared.log(`AI terms sanitizer initialized (${currentMode} mode, throttled)`);
})();

