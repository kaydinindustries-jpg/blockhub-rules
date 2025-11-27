# Uniblock Quick Start Guide

Get Uniblock up and running in 5 minutes.

## Installation

### Option 1: Load Unpacked (Development)

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `UniBlock` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see the Uniblock extension card appear
   - The extension icon will appear in your toolbar
   - Status should show "Enabled"

### Option 2: Chrome Web Store (Coming Soon)
- Visit Chrome Web Store
- Search for "Uniblock"
- Click "Add to Chrome"

## First Use

1. **Click the Extension Icon**
   - Look for the Uniblock icon in your Chrome toolbar
   - Click it to open the popup

2. **Review Default Settings**
   - All features are ON by default:
     - ✅ Block Ads
     - ✅ Block Cookie Banners
     - ✅ Block AI Widgets
     - ✅ Hide AI Terms (Conservative mode)

3. **Browse the Web**
   - Visit any website
   - Uniblock works automatically
   - Watch the metrics counter increase

4. **Customize Settings**
   - Toggle features on/off as needed
   - Switch AI Terms mode (Conservative ↔ Aggressive)
   - Click "Reset" to clear metrics

## Testing the Extension

### Test Ad Blocking
Visit any of these sites:
- https://www.cnn.com
- https://www.forbes.com
- https://www.theguardian.com

**Expected**: Fewer ads, cleaner pages

### Test Cookie Banner Blocking
Visit any of these sites:
- https://www.bbc.com
- https://www.reuters.com
- https://www.ft.com

**Expected**: No cookie consent popups

### Test AI Widget Blocking
Visit any of these sites:
- https://www.notion.so
- https://www.linkedin.com

**Expected**: No "Ask AI" or chat widgets

### Test AI Terms Hiding
Visit any of these sites:
- https://openai.com
- https://www.anthropic.com

**Expected**: AI-related terms appear blurred

## Troubleshooting

### Extension Not Working
1. Check that extension is enabled (`chrome://extensions/`)
2. Refresh the page you're testing on
3. Check popup to verify features are toggled ON
4. Look for errors in extension console (Developer mode → Inspect views)

### Page Looks Broken
1. Try disabling "Hide AI Terms" feature
2. Switch from Aggressive to Conservative mode
3. Report issue to: kaydin.industries@gmail.com

### Metrics Not Updating
1. Refresh the popup
2. Navigate to a new page
3. Check that features are enabled

### Icons Not Showing
If you see broken icon images:
1. Run: `npm install` (if not already done)
2. Run: `npm run icons`
3. Reload extension in `chrome://extensions/`

## Development Setup

If you want to modify or test the extension:

```bash
# Install dependencies
npm install

# Create icons (if needed)
npm run icons

# Run tests (optional)
npm test

# Lint code (optional)
npm run lint
```

## Viewing Logs

To see what Uniblock is doing:

1. **Open DevTools on any page**
   - Right-click → Inspect
   - Or press F12

2. **Check Console**
   - Look for `[Uniblock]` prefixed messages
   - These show what's being blocked/hidden

3. **Background Service Worker Logs**
   - Go to `chrome://extensions/`
   - Find Uniblock
   - Click "Inspect views: service worker"
   - Check console for background logs

## Uninstalling

1. Go to `chrome://extensions/`
2. Find Uniblock
3. Click "Remove"
4. Confirm removal

All local data (settings, metrics) will be deleted.

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [CHANGELOG.md](CHANGELOG.md) for version history
- Review [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md) for publishing info
- Report issues to: kaydin.industries@gmail.com

## Quick Reference

### Keyboard Shortcuts
- None currently (may be added in future versions)

### Default Settings
```json
{
  "blockAds": true,
  "blockCookies": true,
  "blockAIWidgets": true,
  "hideAITerms": true,
  "aiTermsMode": "conservative"
}
```

### Permissions Used
- `declarativeNetRequest` - Block ads/trackers
- `storage` - Save settings
- `tabs` - Reload on settings change
- `<all_urls>` - Run on all websites

### File Structure
```
UniBlock/
├── manifest.json          # Extension config
├── background.js          # Service worker
├── content/              # Content scripts
│   ├── shared.js
│   ├── cookies.js
│   ├── ai_widgets.js
│   └── ai_terms.js
├── ui/                   # Popup interface
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── rules/                # Blocking rules
│   ├── ads_static.json
│   └── trackers_static.json
└── assets/               # Icons
    └── icons/
```

---

**Need Help?** Email: kaydin.industries@gmail.com

