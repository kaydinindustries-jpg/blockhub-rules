# Chrome Web Store Submission Guide

This document contains all the information needed to submit Uniblock to the Chrome Web Store.

## Store Listing Information

### Basic Info
- **Name**: Uniblock
- **Summary**: Block ads, cookie banners, AI widgets, and hide AI-related terms. Clean, fast, and free.
- **Category**: Productivity
- **Language**: English (US)

### Detailed Description

```
Uniblock is a comprehensive privacy and browsing enhancement extension that blocks advertisements, automatically rejects cookie consent banners, removes AI chat widgets, and visually sanitizes AI-related terminology from web pages.

🚫 AD BLOCKING
• Blocks 40+ major advertising networks (Google Ads, Facebook Ads, Taboola, Outbrain, Criteo, etc.)
• Blocks 25+ tracking services (Google Analytics, Hotjar, Mixpanel, etc.)
• Fast, reliable blocking using Chrome's native declarativeNetRequest API
• No network dependency - works offline

🍪 COOKIE BANNER AUTO-REJECT
• Automatically detects and rejects cookie consent banners
• Supports 10 major Consent Management Platforms (OneTrust, Quantcast, Cookiebot, Didomi, etc.)
• Multilingual support for 13 languages
• Generic fallback for unknown CMPs
• Hides banners when auto-reject isn't possible

🤖 AI WIDGET BLOCKING
• Blocks AI chat assistants and "Ask AI" popups
• Detects widgets from ChatGPT, Gemini, Copilot, Claude, Meta AI, Grok, and more
• Removes generic AI chat widgets and support bots
• Handles dynamically injected widgets
• Shadow DOM support

✨ AI TERMS SANITIZATION
• Visually hides AI-related terminology from web pages
• Conservative mode (default): Only hides obvious AI terms
• Aggressive mode: Hides all AI terms with smart false-positive prevention
• Multilingual detection (14+ languages)
• Comprehensive stoplist prevents hiding common words
• Preserves links and functionality

PRIVACY FIRST
• Zero data collection - no telemetry or tracking
• All processing happens locally in your browser
• No remote code execution
• Open source and transparent

PERFORMANCE OPTIMIZED
• Minimal page load impact (<50ms overhead)
• Low memory footprint (<20MB per tab)
• Efficient algorithms and batched processing
• Smart caching and early exits

EASY TO USE
• Works automatically on all websites
• Simple on/off toggles for each feature
• Real-time metrics display
• No configuration required

Perfect for users who want a cleaner, more private browsing experience without intrusive ads, cookie popups, AI assistants, or AI-related terminology.
```

### Screenshots (Required: 1280x800 or 640x400)

**Screenshot 1: Popup Interface**
- Title: "Clean, Simple Interface"
- Description: "View blocking statistics and toggle features with one click"

**Screenshot 2: Ad Blocking in Action**
- Title: "Powerful Ad Blocking"
- Description: "Block ads and trackers from 40+ major networks"

**Screenshot 3: Cookie Banner Rejection**
- Title: "Auto-Reject Cookie Banners"
- Description: "Automatically reject cookie consent popups on all websites"

**Screenshot 4: AI Widget Blocking**
- Title: "Block AI Widgets"
- Description: "Remove AI chat assistants and popups from your browsing"

**Screenshot 5: AI Terms Hidden**
- Title: "Hide AI Terminology"
- Description: "Visually sanitize AI-related terms with smart detection"

### Promotional Images

**Small Tile (440x280)**
- Uniblock logo with tagline: "Clean, Fast, Free"

**Large Tile (920x680)**
- Feature showcase with icons for each main feature

**Marquee (1400x560)**
- Hero image with key benefits and call-to-action

### Additional Fields

**Website**: https://github.com/[your-repo]/uniblock (update with actual URL)

**Support Email**: kaydin.industries@gmail.com

**Privacy Policy**: (Required - create separate document)

## Privacy Policy (Required)

```
UNIBLOCK PRIVACY POLICY

Last Updated: November 7, 2025

OVERVIEW
Uniblock is committed to protecting your privacy. This extension does not collect, store, or transmit any personal data.

DATA COLLECTION
Uniblock does NOT collect:
• Browsing history
• Personal information
• Usage statistics
• Analytics data
• Any other user data

LOCAL STORAGE
Uniblock stores the following data locally on your device only:
• Extension settings (feature toggles, mode preferences)
• Blocking metrics (counts of blocked items)
• Site whitelist (if configured)

This data never leaves your device and is not transmitted to any server.

PERMISSIONS
Uniblock requests the following permissions:
• declarativeNetRequest: To block ads and trackers at the network level
• storage: To save your settings locally
• tabs: To reload tabs when settings change
• <all_urls>: To run content scripts on all websites

These permissions are used solely for the extension's functionality and not for data collection.

THIRD-PARTY SERVICES
Uniblock does not use any third-party services, analytics, or tracking.

UPDATES
This privacy policy may be updated. Check this page for the latest version.

CONTACT
For questions: kaydin.industries@gmail.com
```

## Permissions Justification

When submitting, you'll need to justify each permission:

### declarativeNetRequest
**Justification**: "Required to block advertisements and tracking scripts at the network level using Chrome's native blocking API. This is the core functionality of the extension."

### declarativeNetRequestWithHostAccess
**Justification**: "Required to apply blocking rules to all websites as requested by the user."

### storage
**Justification**: "Required to save user preferences (feature toggles, mode settings) and blocking metrics locally on the device."

### scripting
**Justification**: "Required to inject content scripts that detect and hide cookie banners, AI widgets, and AI terms on web pages."

### alarms
**Justification**: "Required for periodic cleanup tasks and potential future rule updates."

### tabs
**Justification**: "Required to reload tabs when user changes settings, ensuring immediate effect of preference changes."

### host_permissions: <all_urls>
**Justification**: "Required to run content scripts on all websites to block cookie banners, AI widgets, and sanitize AI terms as requested by the user. The extension's core value proposition is universal blocking across all sites."

## Submission Checklist

- [ ] All code is production-ready and tested
- [ ] Icons created in all required sizes (16, 32, 48, 128)
- [ ] Screenshots prepared (1280x800 or 640x400)
- [ ] Promotional images created (440x280, 920x680, 1400x560)
- [ ] Privacy policy published and linked
- [ ] manifest.json validated
- [ ] Extension tested in Chrome 114+
- [ ] All permissions justified
- [ ] Store listing text prepared
- [ ] Support email configured
- [ ] Version number set (0.1.0)
- [ ] CHANGELOG.md updated
- [ ] README.md complete
- [ ] LICENSE file included
- [ ] .gitignore configured
- [ ] No console.logs in production code
- [ ] No debug code or comments
- [ ] Code follows Chrome Web Store policies

## Chrome Web Store Policies Compliance

### Content Policies
✅ No misleading functionality
✅ No malicious code
✅ No spam or deceptive behavior
✅ Respects user privacy
✅ No cryptocurrency mining
✅ No remote code execution

### Permission Policies
✅ Only requests necessary permissions
✅ Permissions clearly justified
✅ No overly broad permissions without justification
✅ User data handled responsibly

### Quality Guidelines
✅ Clear, accurate description
✅ High-quality icons and screenshots
✅ Functional and tested
✅ Good user experience
✅ Responsive support

## Post-Submission

After submission:
1. Monitor developer dashboard for review status
2. Respond promptly to any reviewer questions
3. Address any policy violations immediately
4. Update listing based on user feedback
5. Plan regular updates and improvements

## Version Updates

For future updates:
1. Update version in manifest.json
2. Update CHANGELOG.md
3. Test thoroughly
4. Create new .zip package
5. Upload to Chrome Web Store
6. Update store listing if needed
7. Respond to user reviews

---

**Important**: Replace placeholder icons with professionally designed icons before submission. The current icons are placeholders only.

