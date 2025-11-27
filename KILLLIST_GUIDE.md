# Uniblock Kill-List Guide

## What is the Kill-List?

The kill-list is a **manually curated list** of specific DOM elements to block. It provides surgical precision for blocking ads, AI elements, chat widgets, and cookie banners that bypass standard detection methods.

Each entry contains:
- **selector**: CSS selector to find the element (what you copy from DevTools)
- **fallbackPatterns**: ID/class patterns if selector changes (backup)
- **textContains**: Optional text verification (double-check)
- **site**: Which website this applies to (for your reference)
- **notes**: Description of what's being blocked (for your reference)

---

## File Location

**`utils/kill_list.json`**

This JSON file contains all the entries extracted directly from browser DevTools.

---

## 📖 STEP-BY-STEP: How to Add Elements to Kill-List

### Step 1: Find the Element You Want to Block

1. **Go to the website** (e.g., leparking.fr)
2. **Right-click on the ad/element** you want to block
3. **Click "Inspect"** (or "Inspecter" in French)
4. DevTools opens and highlights the element in the HTML

### Step 2: Understand What You're Looking At

In DevTools, you'll see something like this:

```html
<div class="pepsia_player fabster_player" data-token="00ev">
  <div id="fabster_player_container_938e3c3e">
    ...
  </div>
</div>
```

**Key parts to identify:**

- **`class="pepsia_player fabster_player"`** ← This is the **CLASS**
- **`id="fabster_player_container_938e3c3e"`** ← This is the **ID**
- **`<div>`** ← This is the element type (tag)

### Step 3: Copy the Selector

**Method A: Automatic (Recommended)**

1. In DevTools, **right-click** on the highlighted element
2. Choose **"Copy"** → **"Copy selector"**
3. You get something like: `.pepsia_player` or `#fabster_player_container_938e3c3e`

**Method B: Manual**

- If element has an **ID**: use `#id_name` (e.g., `#fabster_player_container`)
- If element has a **CLASS**: use `.class_name` (e.g., `.pepsia_player`)
- You can combine: `.pepsia_player, .fabster_player` (blocks both)

### Step 4: Extract Fallback Patterns

**Why?** If the website changes the selector, fallback patterns will still catch it.

Look at the element again:
```html
<div class="pepsia_player fabster_player" id="fabster_player_container_938e3c3e">
```

- **ID pattern**: Look for the **stable part** of the ID
  - Full ID: `fabster_player_container_938e3c3e`
  - Stable part: `fabster_player` (the random part `938e3c3e` changes)
  
- **Class pattern**: Look for the **main class**
  - Classes: `pepsia_player fabster_player`
  - Stable part: `pepsia_player` or `fabster_player`

### Step 5: Add to kill_list.json

Open `utils/kill_list.json` and add your entry:

```json
{
  "ads": [
    {
      "id": 1,
      "site": "leparking.fr",
      "feature": "Fabster video ad",
      "selector": ".pepsia_player, .fabster_player",
      "fallbackPatterns": {
        "id": "fabster_player",
        "class": "pepsia_player"
      },
      "textContains": null,
      "notes": "Video ad player"
    }
  ]
}
```

**Field explanations:**

- **`id`**: Unique number (1, 2, 3, ...)
- **`site`**: Website domain (e.g., "leparking.fr")
- **`feature`**: What you're blocking (e.g., "Fabster video ad")
- **`selector`**: The CSS selector you copied (e.g., ".pepsia_player")
- **`fallbackPatterns.id`**: Stable part of the ID (or `null`)
- **`fallbackPatterns.class`**: Stable part of the class (or `null`)
- **`textContains`**: Optional text to verify (or `null`)
- **`notes`**: Your notes (e.g., "Video ad player")

### Step 6: Reload Extension

1. Go to `chrome://extensions/`
2. Find **Uniblock**
3. Click **Reload** button
4. Visit the website → Element should be blocked!

**OR** use hot-reload (faster):
1. Open DevTools Console (F12)
2. Type: `UnibleckReloadKillList()`
3. Press Enter → Element disappears immediately!

---

## 📋 Kill-List Structure

The kill-list has **4 categories** (arrays of entries):

```json
{
  "comment": "Kill-list description",
  "version": "1.0",
  "lastUpdated": "2025-11-08",
  
  "ads": [
    {
      "id": 1,
      "site": "example.com",
      "feature": "Description of ad",
      "selector": "#ad-element",
      "fallbackPatterns": {
        "id": "ad-element",
        "class": "ad-class"
      },
      "textContains": null,
      "notes": "Your notes"
    }
  ],
  
  "aiTerms": [
    {
      "id": 1,
      "site": "example.com",
      "feature": "AI text element",
      "selector": "#ai-text",
      "fallbackPatterns": {
        "id": "ai-text",
        "class": "ai-class"
      },
      "textContains": "AI generated",
      "notes": "Your notes"
    }
  ],
  
  "aiWidgets": [
    {
      "id": 1,
      "site": "example.com",
      "feature": "AI chat widget",
      "selector": "#chat-widget",
      "fallbackPatterns": {
        "id": "chat-widget",
        "class": "chat-class"
      },
      "textContains": null,
      "notes": "Your notes"
    }
  ],
  
  "cookies": [
    {
      "id": 1,
      "site": "example.com",
      "feature": "Cookie banner",
      "selector": "#cookie-banner",
      "fallbackPatterns": {
        "id": "cookie-banner",
        "class": "cookie-class"
      },
      "textContains": null,
      "notes": "Your notes"
    }
  ]
}
```

### Category Explanations

- **`ads`**: Advertisements, video players, sponsored content, floating ads
- **`aiTerms`**: AI-related text elements (labels, tooltips, summaries) AND UI elements (icons, logos, badges)
  - **IMPORTANT**: aiTerms uses ONLY exact selector matching (no fallback)
  - Use for: "AI" text, Gemini icons, Copilot logos, AI badges, etc.
  - Can block BOTH text AND visual elements
- **`aiWidgets`**: AI chat widgets, assistants, chatbots (interactive elements)
- **`cookies`**: Cookie consent banners, GDPR popups, privacy notices

---

## How to Add Elements

### Step-by-Step Process

1. **Find the element** (Right-click → Inspect in DevTools)
2. **Copy selector** (Right-click element in DevTools → Copy → Copy selector)
3. **Extract info**:
   - `id` attribute (if present)
   - `class` attribute (if present)
   - Text content
4. **Add to kill_list.json** following the structure below

### Example: Adding leparking.fr Ads

```json
{
  "ads": [
    {
      "id": 1,
      "site": "leparking.fr",
      "feature": "Player overlay ad",
      "selector": "#player_screen_overlay_link",
      "fallbackPatterns": {
        "id": "player_screen_overlay",
        "class": null
      },
      "textContains": null,
      "notes": "Video player overlay ad link"
    },
    {
      "id": 2,
      "site": "leparking.fr",
      "feature": "Fabster video ad",
      "selector": ".pepsia_player, .fabster_player",
      "fallbackPatterns": {
        "id": "fabster_player",
        "class": "pepsia_player"
      },
      "textContains": null,
      "notes": "Video ad player"
    }
  ]
}
```

### Entry Fields Explained

Each entry in the kill-list has these fields:

```json
{
  "id": 1,                    // Unique ID (number)
  "site": "example.com",      // Website domain
  "feature": "Description",   // What's being blocked
  "selector": "#element",     // CSS selector (can be multiple: "#id, .class")
  "fallbackPatterns": {       // Backup if selector changes
    "id": "partial-id",       // Partial ID match (or null)
    "class": "partial-class"  // Partial class match (or null)
  },
  "textContains": "text",     // Optional text verification (or null)
  "notes": "Additional info"  // Your notes
}
```

### Matching Strategy (3 Stages)

The blocker uses a **cascade approach** for robustness:

#### Stage 1: Selector Match (Fastest)
Tries to find element using the CSS selector.

#### Stage 2: Fallback Patterns (If selector fails)
Checks if element's ID or class contains the fallback patterns.

#### Stage 3: Text Verification (Optional)
If `textContains` is specified, verifies the element contains that text.

**Why this works**: Even if the site changes the selector, the ID/class patterns will still catch it!

---

## Finding Elements to Block

### Method 1: Chrome DevTools (Recommended)

1. **Right-click** on the ad/element → **Inspect**
2. In DevTools, the element will be highlighted
3. **Right-click** on the element in DevTools → **Copy** → **Copy selector**
4. Add to `killlist.json`

**Example**:
```
Element: <div id="player_screen_overlay_link">
Selector: #player_screen_overlay_link
```

### Method 2: Console

1. Open DevTools (F12) → Console tab
2. Type: `document.querySelector("YOUR_SELECTOR")`
3. If it returns the element, the selector is correct

**Example**:
```javascript
document.querySelector("#player_screen_overlay_link")
// Returns: <a id="player_screen_overlay_link" href="#" target="_blank"></a>
```

### Method 3: Find by Text

If you see an ad but don't know the selector:

1. Right-click → Inspect
2. Look at the element's:
   - `id` attribute
   - `class` attribute
   - Parent elements
3. Create a selector based on what you find

---

## Real Examples from leparking.fr

### Example 1: Player Overlay Ad

**Element**:
```html
<a id="player_screen_overlay_link" href="#" target="_blank"></a>
```

**Add to kill-list**:
```json
{
  "ads": {
    "selectors": [
      "#player_screen_overlay_link"
    ]
  }
}
```

### Example 2: Fabster Player Ad

**Element**:
```html
<div class="pepsia_player fabster_player" data-token="00ev">
  <div id="fabster_player_container_e5d4602d-0c11-4bd2-91a6-0bd12f74689a">
    ...
  </div>
</div>
```

**Add to kill-list**:
```json
{
  "ads": {
    "selectors": [
      ".pepsia_player",
      ".fabster_player",
      "[id*='fabster_player']"
    ]
  }
}
```

### Example 3: Complex Selector

**Element**:
```html
<div> <!-- inside #large-content > section > div > section > ul > div -->
```

**Add to kill-list**:
```json
{
  "ads": {
    "selectors": [
      "#large-content > section.top-detail.clearfix > div.left-fiche.tag_f_root > section > ul > div"
    ]
  }
}
```

---

## Testing Your Kill-List

### Method 1: Reload Extension

1. Go to `chrome://extensions/`
2. Find Uniblock
3. Click **Reload** button
4. Visit the website with the ad
5. Check if ad is blocked

### Method 2: Hot-Reload (Faster)

1. Visit the website with the ad
2. Open DevTools (F12) → Console
3. Type: `UnibleckReloadKillList()`
4. Press Enter
5. Ad should disappear immediately

---

## Kill-List Template

Here's a template you can use:

```json
{
  "comment": "Kill-list of specific DOM elements to block",
  "version": "1.0",
  "lastUpdated": "2025-11-07",
  
  "ads": {
    "selectors": [
      "#your-ad-selector-here",
      ".your-ad-class-here"
    ],
    "attributes": [
      "data-ad-slot"
    ],
    "classPatterns": [
      "ad-",
      "advertisement"
    ],
    "idPatterns": [
      "ad-",
      "google_ads"
    ]
  },
  
  "aiWidgets": {
    "selectors": [
      "#drift-widget",
      "#intercom-container"
    ],
    "attributes": [
      "data-chat-widget"
    ]
  },
  
  "cookieBanners": {
    "selectors": [
      "#onetrust-banner-sdk",
      ".cookie-banner"
    ]
  }
}
```

---

## Tips & Best Practices

### ✅ DO:
- Use **exact selectors** when possible (most reliable)
- Test each selector before adding
- Add comments in the JSON (use "comment" fields)
- Keep the kill-list organized by website or category
- Use `[id*='partial']` for dynamic IDs

### ❌ DON'T:
- Don't use overly broad selectors (e.g., `div`, `span`)
- Don't block legitimate content
- Don't use selectors that might match multiple elements unintentionally
- Don't forget to test after adding

---

## Troubleshooting

### Ad Still Showing?

1. **Check selector is correct**:
   ```javascript
   document.querySelector("#your-selector")
   ```

2. **Check element is not dynamically generated**:
   - Some ads load after page load
   - Kill-list blocker scans at 1.5s and 4s after page load
   - Try hot-reload: `UnibleckReloadKillList()`

3. **Check element is not in iframe**:
   - If ad is inside an iframe, you need to block the iframe itself
   - Example: `iframe[src*="ad-domain.com"]`

4. **Check feature is enabled**:
   - Open Uniblock popup
   - Verify "Block Ads" is ON

### Metrics Not Counting?

The kill-list blocker properly increments metrics:
- Ads → `adsBlocked`
- AI Widgets → `aiWidgetsRemoved`
- Cookie Banners → `cookiesRejected`

If metrics aren't updating:
1. Check DevTools console for `[Uniblock]` messages
2. Verify element was actually blocked: `element.hasAttribute('data-uniblock-hidden')`

---

## Advanced: Dynamic IDs

Some ads have dynamic IDs that change on each page load:

**Bad**:
```html
<div id="ad_container_12345678">
```

**Solution**: Use partial matching:
```json
{
  "ads": {
    "selectors": [
      "[id^='ad_container_']"  // Starts with
    ]
  }
}
```

Or use ID patterns:
```json
{
  "ads": {
    "idPatterns": [
      "ad_container_"
    ]
  }
}
```

---

## Example: Complete leparking.fr Kill-List

```json
{
  "comment": "leparking.fr specific blockers",
  "version": "1.0",
  
  "ads": {
    "selectors": [
      "#player_screen_overlay_link",
      ".pepsia_player",
      ".fabster_player",
      "[id*='fabster_player']",
      "[class*='fabster_player']",
      "#large-content > section.top-detail.clearfix > div.left-fiche.tag_f_root > section > ul > div",
      "[id*='player_overlay']",
      "[class*='player-ad']"
    ],
    "attributes": [
      "data-ad-slot",
      "data-advertisement"
    ],
    "classPatterns": [
      "pepsia_",
      "fabster_",
      "player-ad",
      "video-ad"
    ],
    "idPatterns": [
      "player_overlay",
      "fabster_player",
      "ad_container"
    ]
  }
}
```

---

## Maintenance

### Regular Updates

1. Visit websites regularly
2. Check for new ad formats
3. Add new selectors to kill-list
4. Test and verify

### Version Tracking

Update the version number when making changes:

```json
{
  "version": "1.1",
  "lastUpdated": "2025-11-08"
}
```

---

## Support

If you need help finding selectors or adding elements to the kill-list:

**Email**: kaydin.industries@gmail.com

Include:
- Website URL
- Screenshot of the ad
- Element HTML (from DevTools)

---

**Remember**: The kill-list is YOUR tool. You have full control to add, remove, or modify any selectors as needed!


---

## 🎯 WHAT IS "SELECTOR", "CLASS", "ID"?

### Simple Explanation

Think of a webpage like a house with many rooms (elements):

- **ID** = The room's unique address (e.g., "bedroom-1")
  - Only ONE element can have this ID
  - In CSS: `#bedroom-1`
  
- **CLASS** = The room's type (e.g., "bedroom")
  - MULTIPLE elements can have the same class
  - In CSS: `.bedroom`
  
- **SELECTOR** = How you tell the computer "find this room"
  - Can be an ID: `#bedroom-1`
  - Can be a class: `.bedroom`
  - Can be both: `#bedroom-1.bedroom`

### In DevTools

When you inspect an element, you see:

```html
<div id="fabster_player_container" class="pepsia_player fabster_player">
```

**What you copy:**

- **ID selector**: `#fabster_player_container`
- **Class selector**: `.pepsia_player` or `.fabster_player`
- **Combined**: `.pepsia_player, .fabster_player` (blocks both)

### What Goes Where in kill_list.json

```json
{
  "id": 1,                              // ← Your entry number (1, 2, 3...)
  "site": "leparking.fr",               // ← Website domain
  "feature": "Fabster video ad",        // ← What you're blocking
  "selector": ".pepsia_player",         // ← COPY FROM DEVTOOLS (with . or #)
  "fallbackPatterns": {
    "id": "fabster_player",             // ← ID WITHOUT the #
    "class": "pepsia_player"            // ← CLASS WITHOUT the .
  },
  "textContains": null,                 // ← Optional text (or null)
  "notes": "Video ad"                   // ← Your notes
}
```

**IMPORTANT:**
- In `selector`: Use `.class` or `#id` (WITH the symbol)
- In `fallbackPatterns`: Use `class` or `id` (WITHOUT the symbol)

---

## 🔍 REAL EXAMPLE: leparking.fr Fabster Ad

### What You See on the Page

A video ad player that covers the content.

### Step-by-Step

1. **Right-click on the ad** → Inspect
2. **DevTools shows:**

```html
<div class="pepsia_player fabster_player" data-token="00ev">
  <div id="fabster_player_container_938e3c3e-faa6-426e">
    ...
  </div>
</div>
```

3. **Identify:**
   - **Classes**: `pepsia_player`, `fabster_player`
   - **ID**: `fabster_player_container_938e3c3e-faa6-426e`
   - **Stable ID part**: `fabster_player` (the rest is random)

4. **Copy selector**: `.pepsia_player, .fabster_player`

5. **Add to kill_list.json:**

```json
{
  "ads": [
    {
      "id": 1,
      "site": "leparking.fr",
      "feature": "Fabster/Pepsia video player ad",
      "selector": ".pepsia_player, .fabster_player",
      "fallbackPatterns": {
        "id": "fabster_player",
        "class": "pepsia_player"
      },
      "textContains": null,
      "notes": "Video ad player that appears in content sections"
    }
  ]
}
```

6. **Reload extension** → Ad is blocked! ✅

---

## 💡 TIPS & TRICKS

### Tip 1: Multiple Selectors

You can block multiple elements with one entry:

```json
"selector": ".ad-class-1, .ad-class-2, #ad-id"
```

This blocks ALL elements that match ANY of these.

### Tip 2: When to Use textContains

Use `textContains` when the selector might match other elements:

```json
{
  "selector": ".button",
  "textContains": "Chat with AI",
  "notes": "Only blocks buttons that say 'Chat with AI'"
}
```

### Tip 3: Fallback Patterns Save You

If the website changes from:
```html
<div class="pepsia_player_v1">
```

To:
```html
<div class="pepsia_player_v2">
```

Your fallback pattern `"class": "pepsia_player"` will still catch it!

### Tip 4: Use null for Empty Fields

If there's no ID, no class, or no text:

```json
{
  "fallbackPatterns": {
    "id": null,
    "class": "my-class"
  },
  "textContains": null
}
```

### Tip 5: Test Before Adding Many

Add ONE entry, reload, test. If it works, add more.

---

## ❌ COMMON MISTAKES

### Mistake 1: Forgetting the Symbol

❌ **Wrong:**
```json
"selector": "pepsia_player"
```

✅ **Correct:**
```json
"selector": ".pepsia_player"
```

### Mistake 2: Adding Symbol to Fallback

❌ **Wrong:**
```json
"fallbackPatterns": {
  "class": ".pepsia_player"
}
```

✅ **Correct:**
```json
"fallbackPatterns": {
  "class": "pepsia_player"
}
```

### Mistake 3: Blocking Too Broadly

❌ **Wrong (blocks all divs!):**
```json
"selector": "div"
```

✅ **Correct (specific):**
```json
"selector": ".pepsia_player"
```

### Mistake 4: Invalid JSON

❌ **Wrong (missing comma):**
```json
{
  "id": 1
  "site": "example.com"
}
```

✅ **Correct:**
```json
{
  "id": 1,
  "site": "example.com"
}
```

---

## 🚀 QUICK REFERENCE

| Field | What It Is | Example | Required? |
|-------|-----------|---------|-----------|
| `id` | Entry number | `1` | ✅ Yes |
| `site` | Website domain | `"leparking.fr"` | ✅ Yes |
| `feature` | What you're blocking | `"Video ad"` | ✅ Yes |
| `selector` | CSS selector | `".ad-class"` | ✅ Yes |
| `fallbackPatterns.id` | ID pattern | `"ad-id"` or `null` | ✅ Yes |
| `fallbackPatterns.class` | Class pattern | `"ad-class"` or `null` | ✅ Yes |
| `textContains` | Text verification | `"Ad"` or `null` | ✅ Yes |
| `notes` | Your notes | `"Video player"` | ✅ Yes |

---

## 🆘 TROUBLESHOOTING

### Element Still Showing?

1. **Check selector is correct:**
   ```javascript
   // In DevTools Console:
   document.querySelector(".pepsia_player")
   ```
   If it returns `null`, your selector is wrong.

2. **Check extension is loaded:**
   - Go to `chrome://extensions/`
   - Verify Uniblock is enabled

3. **Check feature is enabled:**
   - Click Uniblock icon
   - Verify "Block Ads" (or relevant feature) is ON

4. **Check logs:**
   - Open DevTools Console (F12)
   - Look for `[Uniblock]` messages

### Hot-Reload Not Working?

1. Make sure you saved `kill_list.json`
2. In Console, type: `UnibleckReloadKillList()`
3. Check for errors in Console

### Blocked Wrong Element?

1. Remove the entry from `kill_list.json`
2. Reload extension
3. Element should reappear

---

## 📞 NEED HELP?

**Email**: kaydin.industries@gmail.com

Include:
- Website URL
- Screenshot of the element
- What you tried
- Error messages (if any)

