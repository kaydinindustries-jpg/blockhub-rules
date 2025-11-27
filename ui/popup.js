/**
 * BlockHub Popup UI Controller
 * 
 * Manages the extension popup interface including:
 * - Loading and displaying settings
 * - Updating feature toggles
 * - Displaying metrics
 * - Handling user interactions
 * - Problem reporting
 * - Per-site whitelist management
 */

(function() {
  'use strict';

  // DOM elements
  const elements = {
    // Feature toggles
    blockAds: document.getElementById('blockAds'),
    blockCookies: document.getElementById('blockCookies'),
    blockAIWidgets: document.getElementById('blockAIWidgets'),
    hideAITerms: document.getElementById('hideAITerms'),
    
    // AI terms mode
    aiTermsModeContainer: document.getElementById('aiTermsModeContainer'),
    aiTermsModeRadios: document.querySelectorAll('input[name="aiTermsMode"]'),
    
    // Metrics
    adsBlocked: document.getElementById('adsBlocked'),
    cookiesRejected: document.getElementById('cookiesRejected'),
    aiWidgetsRemoved: document.getElementById('aiWidgetsRemoved'),
    aiTermsHidden: document.getElementById('aiTermsHidden'),
    
    // Actions
    resetMetrics: document.getElementById('resetMetrics'),
    
    // Problem reporting
    reportProblem: document.getElementById('reportProblem'),
    problemForm: document.getElementById('problemForm'),
    closeForm: document.getElementById('closeForm'),
    problemSite: document.getElementById('problemSite'),
    problemType: document.getElementById('problemType'),
    problemDetails: document.getElementById('problemDetails'),
    sendReport: document.getElementById('sendReport'),
    formStatus: document.getElementById('formStatus'),
    
    // Site control
    currentSite: document.getElementById('currentSite'),
    toggleSite: document.getElementById('toggleSite'),
    toggleSiteText: document.getElementById('toggleSiteText')
  };

  // Current tab info
  let currentTab = null;
  let currentHostname = null;

  /**
   * Format large numbers for display
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Animate number change
   * @param {HTMLElement} element - Element to animate
   * @param {number} newValue - New value to display
   */
  function animateNumber(element, newValue) {
    const oldValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
    
    if (oldValue === newValue) return;
    
    // Add pulse animation
    element.style.transform = 'scale(1.2)';
    element.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
      element.textContent = formatNumber(newValue);
      element.style.transform = 'scale(1)';
    }, 100);
  }

  /**
   * Get current tab information
   */
  async function getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        currentTab = tabs[0];
        const url = new URL(currentTab.url);
        currentHostname = url.hostname;
        elements.currentSite.textContent = currentHostname;
        elements.problemSite.value = currentHostname;
        return currentHostname;
      }
    } catch (error) {
      console.error('[BlockHub] Error getting current tab:', error);
      elements.currentSite.textContent = 'Unknown';
      elements.problemSite.value = 'Unknown';
    }
    return null;
  }

  /**
   * Check if current site is whitelisted
   */
  async function checkWhitelistStatus() {
    if (!currentHostname) return;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_SETTINGS' 
      });
      
      if (response && response.success) {
        const whitelist = response.settings.whitelist || [];
        const isWhitelisted = whitelist.includes(currentHostname);
        
        if (isWhitelisted) {
          elements.toggleSite.classList.add('disabled');
          elements.toggleSiteText.textContent = 'Resume on this website';
        } else {
          elements.toggleSite.classList.remove('disabled');
          elements.toggleSiteText.textContent = 'Stop on this website';
        }
      }
    } catch (error) {
      console.error('[BlockHub] Error checking whitelist:', error);
    }
  }

  /**
   * Load and display current settings
   */
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      
      if (response && response.success) {
        const settings = response.settings;
        
        // Update toggles
        elements.blockAds.checked = settings.blockAds !== false;
        elements.blockCookies.checked = settings.blockCookies !== false;
        elements.blockAIWidgets.checked = settings.blockAIWidgets !== false;
        elements.hideAITerms.checked = settings.hideAITerms !== false;
        
        // Update AI terms mode
        const mode = settings.aiTermsMode || 'conservative';
        elements.aiTermsModeRadios.forEach(radio => {
          radio.checked = radio.value === mode;
        });
        
        // Show/hide mode selector based on hideAITerms toggle
        updateModeVisibility();
      }
    } catch (error) {
      console.error('[BlockHub] Error loading settings:', error);
    }
  }

  /**
   * Load and display metrics
   */
  async function loadMetrics() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_METRICS' });
      
      if (response && response.success) {
        const metrics = response.metrics;
        
        animateNumber(elements.adsBlocked, metrics.adsBlocked || 0);
        animateNumber(elements.cookiesRejected, metrics.cookiesRejected || 0);
        animateNumber(elements.aiWidgetsRemoved, metrics.aiWidgetsRemoved || 0);
        animateNumber(elements.aiTermsHidden, metrics.aiTermsHidden || 0);
      }
    } catch (error) {
      console.error('[BlockHub] Error loading metrics:', error);
    }
  }

  /**
   * Update setting in background
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async function updateSetting(key, value) {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { [key]: value }
      });
    } catch (error) {
      console.error('[BlockHub] Error updating setting:', error);
    }
  }

  /**
   * Show/hide AI terms mode selector
   */
  function updateModeVisibility() {
    if (elements.hideAITerms.checked) {
      elements.aiTermsModeContainer.classList.remove('hidden');
    } else {
      elements.aiTermsModeContainer.classList.add('hidden');
    }
  }

  /**
   * Toggle site whitelist
   */
  async function toggleSiteWhitelist() {
    if (!currentHostname) return;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_SETTINGS' 
      });
      
      if (response && response.success) {
        let whitelist = response.settings.whitelist || [];
        const isWhitelisted = whitelist.includes(currentHostname);
        
        if (isWhitelisted) {
          // Remove from whitelist
          whitelist = whitelist.filter(host => host !== currentHostname);
        } else {
          // Add to whitelist
          whitelist.push(currentHostname);
        }
        
        await updateSetting('whitelist', whitelist);
        await checkWhitelistStatus();
        
        // Reload the current tab to apply changes
        if (currentTab) {
          chrome.tabs.reload(currentTab.id);
        }
      }
    } catch (error) {
      console.error('[BlockHub] Error toggling whitelist:', error);
    }
  }

  /**
   * Show problem report form
   */
  function showProblemForm() {
    elements.problemForm.classList.remove('hidden');
    elements.formStatus.classList.add('hidden');
    elements.problemType.value = '';
    elements.problemDetails.value = '';
  }

  /**
   * Hide problem report form
   */
  function hideProblemForm() {
    elements.problemForm.classList.add('hidden');
  }

  /**
   * Send problem report via mailto
   */
  function sendProblemReport() {
    const site = elements.problemSite.value;
    const type = elements.problemType.value;
    const details = elements.problemDetails.value;
    
    // Validation
    if (!type) {
      showFormStatus('Please select a problem type', 'error');
      return;
    }
    
    if (!details || details.trim().length < 10) {
      showFormStatus('Please provide more details (at least 10 characters)', 'error');
      return;
    }
    
    // Build email
    const subject = `BlockHub Issue Report: ${type} on ${site}`;
    const body = `
Website: ${site}
Problem Type: ${type}

Details:
${details}

---
Sent from BlockHub Extension
Browser: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    const mailtoLink = `mailto:domcapturer@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open mailto link
    window.open(mailtoLink, '_blank');
    
    // Show success message
    showFormStatus('Report prepared! Please send the email from your mail client.', 'success');
    
    // Clear form after 2 seconds
    setTimeout(() => {
      hideProblemForm();
    }, 2000);
  }

  /**
   * Show form status message
   */
  function showFormStatus(message, type) {
    elements.formStatus.textContent = message;
    elements.formStatus.className = `form-status ${type}`;
    elements.formStatus.classList.remove('hidden');
  }

  /**
   * Reset all metrics
   */
  async function resetMetrics() {
    if (!confirm('Reset all statistics? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({ type: 'RESET_METRICS' });
      await loadMetrics();
    } catch (error) {
      console.error('[BlockHub] Error resetting metrics:', error);
    }
  }

  /**
   * Initialize popup
   */
  async function init() {
    // Load current tab info
    await getCurrentTab();
    await checkWhitelistStatus();
    
    // Load data
    await loadSettings();
    await loadMetrics();
    
    // Setup event listeners
    elements.blockAds.addEventListener('change', (e) => {
      updateSetting('blockAds', e.target.checked);
    });
    
    elements.blockCookies.addEventListener('change', (e) => {
      updateSetting('blockCookies', e.target.checked);
    });
    
    elements.blockAIWidgets.addEventListener('change', (e) => {
      updateSetting('blockAIWidgets', e.target.checked);
    });
    
    elements.hideAITerms.addEventListener('change', (e) => {
      updateSetting('hideAITerms', e.target.checked);
      updateModeVisibility();
    });
    
    elements.aiTermsModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          updateSetting('aiTermsMode', e.target.value);
        }
      });
    });
    
    elements.resetMetrics.addEventListener('click', resetMetrics);
    
    // Problem reporting
    elements.reportProblem.addEventListener('click', showProblemForm);
    elements.closeForm.addEventListener('click', hideProblemForm);
    elements.sendReport.addEventListener('click', sendProblemReport);
    
    // Site whitelist
    elements.toggleSite.addEventListener('click', toggleSiteWhitelist);
    
    // Listen for metrics updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'METRICS_UPDATED') {
        loadMetrics();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
