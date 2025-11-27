# BlockHub Rules Repository

This repository contains the rule files for the **BlockHub** Chrome extension, served via jsDelivr CDN with SHA-256 integrity verification.

## 🔐 Security

All rule files are protected by **SHA-256 cryptographic hashing**. The extension verifies the integrity of every file before applying rules, preventing tampering and man-in-the-middle attacks.

## 📁 Structure

```
blockhub-rules/
├── index.json                    # Manifest with SHA-256 hashes
├── cdn/
│   └── v1/
│       ├── ai_terms.json         # AI terminology database
│       ├── ai_widget_selectors.json  # AI widget detection rules
│       ├── cookie_patterns.json  # Cookie banner patterns
│       ├── kill_list.json        # DOM element blocking rules
│       └── preserve_list.json    # Whitelist/exception rules
└── README.md                     # This file
```

## 🌐 CDN URLs

All files are served via jsDelivr:

- **Index**: `https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json`
- **Rules**: `https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/*.json`

## 🔄 Update Process

Rules are updated regularly to block new ads, AI widgets, and cookie banners. The extension automatically fetches updates every 6 hours.

### For Maintainers

1. Edit rule files in `cdn/v1/`
2. Run `node utils/generate_index.js` to update hashes
3. Commit and push to `main` branch
4. Wait 5-10 minutes for CDN cache to purge

See [SECURITY_AND_UPDATES.md](../SECURITY_AND_UPDATES.md) in the extension repository for detailed instructions.

## 📊 Statistics

| File | Size | Rules |
|------|------|-------|
| ai_terms.json | ~2 KB | 50+ terms |
| ai_widget_selectors.json | ~5 KB | 100+ selectors |
| cookie_patterns.json | ~6 KB | 200+ patterns |
| kill_list.json | ~35 KB | 500+ entries |
| preserve_list.json | ~3 KB | 50+ exceptions |

## 🤝 Contributing

Want to help improve BlockHub's blocking rules?

1. **Report False Positives**: Open an issue with details
2. **Submit New Rules**: Fork, add rules, and create a pull request
3. **Test Changes**: Verify rules work on real websites

### Rule Format Examples

**Kill List Entry** (block specific DOM elements):
```json
{
  "id": "example-ad-banner",
  "site": "example.com",
  "feature": "Top banner advertisement",
  "url": "https://example.com",
  "selector": "#ad-banner",
  "jsPath": "document.querySelector('#ad-banner')",
  "text": "Advertisement"
}
```

**AI Widget Selector** (detect AI chat widgets):
```json
{
  "selector": "[class*='ai-chat']",
  "description": "Generic AI chat widget",
  "confidence": "medium"
}
```

## 📜 License

This repository is part of the BlockHub project.

- **Rules**: Public domain (CC0 1.0)
- **Extension**: MIT License

## 📞 Contact

- **Email**: kaydin.industries@gmail.com
- **Issues**: [GitHub Issues](https://github.com/kaydinindustries-jpg/blockhub-rules/issues)

## 🔗 Related

- [BlockHub Extension](https://github.com/kaydinindustries-jpg/uniblock) (main repository)
- [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)

---

**Last Updated**: 2025-11-24  
**Version**: 1.0.0  
**Maintained by**: Kaydin Industries

