# BlockHub

**BlockHub detoxes the modern web by blocking ads, dismantling cookie banners, silencing AI widgets, and hiding AI terminology — automatically, in every language.**

BlockHub ships as a production-ready Chrome extension backed by a global rule engine. Rules are authored in a dedicated repository, versioned on GitHub, and delivered through jsDelivr. Each tab uses the latest CDN data when available and falls back to packaged failsafe rules if the network is down or the payload is invalid.

## Features

### 🚫 Ad Blocking
- Uses Chrome declarativeNetRequest for zero-latency network filtering
- Static rule packs for ads and trackers bundled in `/rules`
- **Kill-List System** for surgical DOM removals (floating overlays, sticky promos)
- **Preserve-List Safeguards** ensure critical UI (YouTube search, Gmail toolbars, etc.) is never touched even when heuristics are aggressive
- Floating-overlay heuristics auto-disable themselves on protected productivity surfaces (Google Workspace, ChatGPT, Notion, Office, etc.) so only curated kill-list entries touch those apps
- Metrics increment only when features are enabled — no phantom counts

### 🍪 Cookie Banner Auto-Reject
- CDN-delivered CMP signatures with automatic fallback to packaged defaults
- Supports OneTrust, Quantcast, Usercentrics, Cookiebot, Didomi, TrustArc, Osano, CookieFirst, Termly, IAB TCF v2, and more
- Multilingual reject phrases (13+ languages) refreshed via rule repo
- Sequential selector execution + text heuristics to survive markup changes
- Graceful degradation: hides banners if rejection fails

### 🤖 AI Widget Blocking
- Dynamic selector + text pattern lists fetched from the CDN
- Covers ChatGPT, Gemini/Bard, Microsoft Copilot, Claude, Meta AI, Grok, LinkedIn AI, Notion AI, Intercom-powered copilots, and custom widgets
- Conservative heuristics plus whitelist of productivity suites and Google services to avoid UI breakage
- Shadow DOM aware and MutationObserver throttled (1s)

### ✨ AI Terms Sanitization
- TreeWalker-based scrubber with configurable modes (conservative/aggressive)
- AI term dictionaries updated globally through CDN JSON
- Extensive stoplist (email/detail/train/etc.) to prevent false positives
- Automatically suspends on checkout, payment, productivity, or legal domains
- MutationObserver disconnects immediately when the feature is toggled OFF

### 🎯 Kill-List System
- Remote `kill_list.json` compiled by the BlockHub team (and you)
- Categories for `ads`, `aiTerms`, `aiWidgets`, and `cookies`
- Exact selector matching for AI terms to eradicate logos, badges, and microcopy without guesswork
- Fallback arrays and hot-reload command (`window.UnibleckReloadKillList`) for rapid iteration
- Every entry captures selector, CSS path, JS path, outerHTML, and notes for forensic-level targeting
- Paired `preserve_list.json` acts as the global safelist so we can block surgically without harming search bars or navigation
- Locale-scoped sections (GLOBAL, EN, FR, DE, ES, IT, PT, NL, PL, JA, KO, ZH) keep DOM samples for each language cleanly separated while the engine still aggregates them for matching
- Canonical en-US samples already capture the Google Search “AI Mode” toggle and the “AI Overview” card so future editors can mirror the same fidelity for AI widget captures

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the project directory
6. The extension is now installed and active

## Usage

### Basic Operation

Once installed, BlockHub runs automatically on all websites. Click the extension icon to:
- View blocking statistics (ads blocked, cookies rejected, AI widgets removed, AI terms hidden)
- Toggle individual protection features on/off
- Adjust blur intensity for AI terminology (Conservative/Aggressive)
- Report problems directly from the popup
- Disable the extension on specific websites
- Reset metrics

### Popup Interface

**Header**
- BlockHub logo and name
- "I see a problem" button for quick issue reporting

**Metrics Dashboard**
- Real-time statistics for all blocking activities
- Professional display with purple accent colors

**Protection Features**
- **Block Advertisements**: Removes ads, trackers, and sponsored content from websites
- **Auto-Reject Cookie Banners**: Automatically declines cookie consent popups and privacy notices
- **Hide AI Chat Widgets**: Removes AI assistants, chatbots, and "Ask AI" popups from pages
- **Blur AI Terminology**: Visually obscures AI-related terms and buzzwords in text content

**Blur Intensity**
- **Conservative (Recommended)**: Only blurs obvious AI terms like "ChatGPT", "Copilot", "Gemini", "Claude", etc. Minimizes false positives.
- **Aggressive**: Also blurs short terms like "AI", "IA", "GPT". Uses extensive stoplist to prevent hiding common words like "email", "detail", "train", etc.

**Site Control**
- View current website hostname
- "Stop on this website" button to disable BlockHub on specific sites
- Whitelist persists across sessions

### Problem Reporting

Found an issue? Click "I see a problem" in the popup to:
1. Auto-fill the current website
2. Select problem type (ad not blocked, cookie banner, AI widget, false positive, site broken, other)
3. Add detailed description
4. Send report via email in one click

Reports are sent to domcapturer@gmail.com with structured information including browser details and timestamp.

## Global Rule Engine

BlockHub separates product logic from rule maintenance. Dynamic JSON bundles live in the public repository [`kaydinindustries-jpg/blockhub-rules`](https://github.com/kaydinindustries-jpg/blockhub-rules) and are consumed from jsDelivr with SHA-256 integrity verification.

- `ai_terms.json` — multilingual dictionaries for conservative/aggressive sanitization
- `ai_widget_selectors.json` — selector/text patterns for AI widgets
- `cookie_patterns.json` — CMP detection selectors, reject buttons, multilingual phrases, and exclusion domains
- `kill_list.json` — precision DOM removal catalogue maintained by the team
- `preserve_list.json` — DOM safelist for UI that must never be hidden

### Delivery and Safety
- **SHA-256 Integrity Verification**: All rule files are cryptographically verified before use
  - `index.json` manifest contains expected SHA-256 hashes for each rule file
  - Extension computes hash of downloaded content and compares with expected value
  - Mismatched hashes trigger automatic fallback to local packaged rules
  - Protects against CDN compromise, man-in-the-middle attacks, and file corruption
- **Dynamic Updates**: CDN URLs use `@main` branch for instant rule deployment
  - Rule updates don't require extension redeployment or Chrome Web Store review
  - Users receive updated rules automatically within 6 hours (cache TTL)
  - Maintainers can push rule changes directly to GitHub
- **Local Fallbacks**: Mirror files in `utils/` guarantee full functionality offline or when the CDN is down.
- **Schema Validation**: Background service worker validates shape and content of every payload. Invalid JSON or missing keys trigger fallback instead of breaking features.
- **Caching & TTLs**: Index manifest cached for 1 hour, rules cached for 6 hours, with 15-minute retry window for fallback modes.
- **Broadcast Updates**: When new rules land, the background service worker notifies every tab. Content scripts reload rules safely, respecting feature toggles.
- **Error Handling**: CDN down, invalid JSON, network timeout, CORS, integrity failures, and rate limiting are all captured, logged, and surfaced to content scripts to avoid silent failures.

### Maintaining the Rules
- Update the `blockhub-rules` repository (pull requests or manual commits via GitHub web interface)
- Run `node utils/generate_index.js` to update SHA-256 hashes in `index.json`
- Push changes to GitHub — jsDelivr serves the new commit within 5-10 minutes
- No extension redeploy or Chrome Web Store review required for rule updates
- Use the kill-list guide to add selectors, fallback patterns, and notes
- Populate the right locale bucket (GLOBAL, EN, FR, etc.) when adding DOM captures so future editors immediately know which regions are covered
- Add mission-critical UI to `preserve_list.json` so future heuristics never hide them
- See `SECURITY_AND_UPDATES.md` for complete workflow documentation

## Architecture

### Technology Stack
- **Manifest V3**: Latest Chrome extension standard
- **Declarative Net Request (DNR)**: For ad/tracker blocking
- **Content Scripts**: For DOM manipulation (cookies, AI widgets, terms)
- **Service Worker**: Background logic and state management
- **Vanilla JavaScript**: No frameworks, minimal dependencies
- **jsDelivr CDN**: Global rule delivery backed by GitHub commits

### File Structure
```
/manifest.json              # Extension manifest (MV3)
/background.js              # Service worker
/rules/
  ads_static.json           # Ad blocking rules
  trackers_static.json      # Tracker blocking rules
/content/
  shared.js                 # Common utilities
  cookies.js                # Cookie banner blocker
  ai_widgets.js             # AI widget blocker
  ai_terms.js               # AI terms sanitizer
  killlist_blocker.js       # Kill-list executor
/ui/
  popup.html                # Extension popup
  popup.js                  # Popup logic
  popup.css                 # Popup styles
/assets/
  icons/                    # Extension icons (16, 32, 48, 128)
/utils/
  ai_terms.json             # Fallback AI terms
  ai_widget_selectors.json  # Fallback AI widget selectors
  cookie_patterns.json      # Fallback CMP patterns
  kill_list.json            # Fallback kill-list
  preserve_list.json        # Fallback preserve/safelist
  stoplist.json             # AI term stoplist
  easylist_converter.js     # EasyList to DNR converter
```

### Performance

BlockHub is designed for minimal performance impact:
- **DNR blocking**: Network-level blocking with zero JavaScript overhead
- **Throttled observers**: MutationObserver callbacks are throttled and budgeted
- **Batched processing**: Text nodes processed in batches with time budgets
- **Smart caching**: Settings cached to avoid repeated storage calls
- **Early exits**: Skip processing on checkout/payment pages
- **Target**: <50ms page load overhead, <20MB memory per tab

## Development

### Prerequisites
- Node.js 16+
- Chrome 114+

### Setup
```bash
# Install dependencies
npm install

# Create placeholder icons
npm run icons

# Run tests (requires Puppeteer)
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Testing
Integration tests use Puppeteer to verify functionality on real websites:
```bash
npm test
```

Tests cover:
- Ad blocking on news sites
- Cookie banner rejection on EU sites
- AI widget detection on major platforms
- AI terms sanitization
- Performance benchmarks
- Shadow DOM handling

### EasyList Conversion
To convert EasyList filter lists to DNR format:
```bash
node utils/easylist_converter.js <input_file> <output_file>
```

Example:
```bash
node utils/easylist_converter.js easylist.txt rules/ads_static.json
```

## Privacy

BlockHub respects your privacy:
- **No data collection**: Zero telemetry, analytics, or tracking
- **Local processing**: All blocking happens locally in your browser
- **No remote code**: No code fetched from external servers
- **No permissions abuse**: Only requests necessary permissions
- **Open source**: Code is transparent and auditable

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Add tests if applicable
5. Submit a pull request

### Code Style
- All code in English (variables, comments, strings)
- JSDoc comments for all functions
- Inline comments explain "why", not "what"
- Follow existing code style (ESLint + Prettier)

### Adding CMPs
1. Update `cookie_patterns.json` in the rules repository
2. (Optional) add fallback selectors to `utils/cookie_patterns.json`
3. Reload rules via jsDelivr (no extension rebuild needed)

### Adding AI Terms
1. Extend `cdn/v1/ai_terms.json` in the rules repository
2. Update `utils/ai_terms.json` fallback if the new term is critical
3. Consider adding stopwords to `utils/stoplist.json`

## Known Limitations

- **Closed Shadow DOM**: Cannot access elements in closed shadow roots (fallback: hide host element)
- **Cross-origin iframes**: Limited access to iframe content (blocked at network level when possible)
- **Dynamic content**: Some sites may require page reload after enabling/disabling features
- **CMP coverage**: New/custom CMPs may not be detected (generic fallback applies)
- **False positives**: Aggressive AI terms mode may occasionally hide legitimate content (use Conservative mode)

## Roadmap

- Popup UI refresh (pending design assets)
- Per-site metrics breakdown + whitelist management
- Export/import of user settings
- Firefox and Edge builds

## Support

For issues, questions, or suggestions:
- **Email**: kaydin.industries@gmail.com
- **GitHub Issues**: *(coming soon)*

## License

MIT License - see LICENSE file for details

## Acknowledgments

- EasyList contributors for filter list standards
- Chrome Extensions team for Manifest V3 APIs
- Open source ad blocking community

---

**Made with ❤️ by Kaydin Industries**

*BlockHub is not affiliated with Google, Chrome, or any ad/tracking networks.*

