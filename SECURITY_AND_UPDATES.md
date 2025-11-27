# 🔐 Security & Update Workflow

## Overview

BlockHub uses **SHA-256 cryptographic hashing** to ensure the integrity of rule files fetched from the CDN. This prevents malicious actors from injecting compromised rules, even if they somehow gain access to the CDN or perform a man-in-the-middle attack.

## Architecture

### Components

1. **index.json** (root of GitHub repo)
   - Contains SHA-256 hashes for all rule files
   - Updated automatically by `utils/generate_index.js`
   - Cached for 1 hour by the extension

2. **Rule Files** (in `rules/cdn/v1/`)
   - `ai_terms.json`
   - `ai_widget_selectors.json`
   - `cookie_patterns.json`
   - `kill_list.json`
   - `preserve_list.json`

3. **Local Fallbacks** (in `utils/`)
   - Identical copies of rule files
   - Used if CDN is unreachable or integrity check fails
   - Packaged with the extension

### Security Flow

```
1. Extension requests index.json from CDN
   ↓
2. Extension caches index (1 hour TTL)
   ↓
3. Extension requests rule file (e.g., kill_list.json)
   ↓
4. Extension computes SHA-256 hash of downloaded file
   ↓
5. Extension compares computed hash with expected hash from index.json
   ↓
6. If match: ✅ Apply rules
   If mismatch: ❌ Reject and use local fallback
```

## 📝 Update Workflow

### When You Modify Rules

Follow these steps **every time** you update any rule file:

```bash
# 1. Navigate to the extension directory
cd /Users/aydinkerem/Desktop/UniBlock

# 2. Edit your rule files in rules/cdn/v1/
# (e.g., add new entries to kill_list.json)

# 3. Sync changes to local fallback files
cp rules/cdn/v1/*.json utils/

# 4. Regenerate index.json with new hashes
node utils/generate_index.js

# 5. Review the changes
git status
git diff index.json

# 6. Commit all changes
git add .
git commit -m "Update rules: [describe changes]"

# 7. Push to GitHub
git push origin main

# 8. Wait 5-10 minutes for jsDelivr CDN to purge cache
# The extension will automatically fetch and verify new rules
```

### Automated Script (Optional)

Create a helper script `update_rules.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Updating BlockHub rules..."

# Sync to fallback
echo "📋 Syncing to local fallback..."
cp rules/cdn/v1/*.json utils/

# Regenerate index
echo "🔐 Regenerating index with new hashes..."
node utils/generate_index.js

# Show changes
echo "📊 Changes:"
git diff --stat

# Prompt for commit
read -p "Commit message: " message
git add .
git commit -m "$message"

echo "✅ Committed. Push with: git push origin main"
```

Make it executable:
```bash
chmod +x update_rules.sh
```

## 🔑 GitHub Repository Setup

### Repository Configuration

- **Repository Name**: `blockhub-rules`
- **Owner**: `kaydinindustries-jpg`
- **Visibility**: Public (required for jsDelivr CDN)
- **Branch**: `main`

### Required Files in Repository

```
blockhub-rules/
├── index.json                    # Root: manifest with hashes
├── cdn/
│   └── v1/
│       ├── ai_terms.json
│       ├── ai_widget_selectors.json
│       ├── cookie_patterns.json
│       ├── kill_list.json
│       └── preserve_list.json
└── README.md                     # Documentation
```

### Initial Setup

1. **Create the repository on GitHub**:
   - Go to https://github.com/new
   - Name: `blockhub-rules`
   - Visibility: Public
   - Initialize with README: Yes

2. **Clone locally** (if not already done):
   ```bash
   git clone https://github.com/kaydinindustries-jpg/blockhub-rules.git
   cd blockhub-rules
   ```

3. **Copy files from extension**:
   ```bash
   # From your extension directory
   mkdir -p cdn/v1
   cp /Users/aydinkerem/Desktop/UniBlock/rules/cdn/v1/*.json cdn/v1/
   cp /Users/aydinkerem/Desktop/UniBlock/index.json .
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Initial commit: rule files with SHA-256 hashes"
   git push origin main
   ```

5. **Verify jsDelivr access**:
   - Wait 5 minutes
   - Visit: https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json
   - Should return your index.json

## 🔒 Security Guarantees

### What This Protects Against

✅ **CDN Compromise**: Even if jsDelivr is hacked, tampered files will be rejected  
✅ **Man-in-the-Middle Attacks**: Modified files in transit will fail hash verification  
✅ **Repository Hijacking**: If someone forks and modifies, hashes won't match  
✅ **Accidental Corruption**: Damaged files during transfer are detected  

### What This Does NOT Protect Against

❌ **Your GitHub Account Compromise**: If attacker has your credentials, they can update both rules and hashes  
❌ **Extension Code Tampering**: If someone modifies the extension itself before installation  
❌ **Local Fallback Tampering**: If attacker modifies files in `utils/` before packaging  

### Best Practices

1. **Enable 2FA on GitHub**: Protects your account from credential theft
2. **Use SSH Keys**: More secure than HTTPS passwords
3. **Review Commits**: Always check `git diff` before pushing
4. **Monitor Repository**: Watch for unexpected commits
5. **Keep Local Fallbacks Updated**: Always sync after rule changes

## 🔐 SSH Key Setup (Recommended)

### Generate SSH Key

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "kaydin.industries@gmail.com"

# When prompted:
# - File: /Users/aydinkerem/.ssh/id_ed25519_github
# - Passphrase: (choose a strong one)

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519_github
```

### Add to GitHub

1. Copy public key:
   ```bash
   cat ~/.ssh/id_ed25519_github.pub
   ```

2. Go to GitHub Settings → SSH Keys → New SSH Key
3. Paste the public key
4. Title: "MacBook - BlockHub Rules"

### Configure Git to Use SSH

```bash
# Update remote URL to use SSH
cd /path/to/blockhub-rules
git remote set-url origin git@github.com:kaydinindustries-jpg/blockhub-rules.git

# Test connection
ssh -T git@github.com
# Should see: "Hi kaydinindustries-jpg! You've successfully authenticated..."
```

## 📊 Monitoring & Verification

### Check Extension Logs

Open Chrome DevTools on the extension background page:

```
chrome://extensions → BlockHub → "Service Worker" link
```

Look for:
- `✓ Integrity verified for [category]` (good)
- `Integrity check FAILED` (bad - investigate immediately)

### Verify Hashes Manually

```bash
# Compute hash of a local file
shasum -a 256 rules/cdn/v1/kill_list.json

# Compare with index.json
cat index.json | grep -A 3 killList
```

### Test CDN Fetch

```bash
# Download from CDN
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json" | shasum -a 256

# Should match the hash in index.json
```

## 🚨 Incident Response

### If Integrity Check Fails

1. **Don't Panic**: Extension automatically falls back to local rules
2. **Check Logs**: Identify which file failed
3. **Verify CDN**: Manually download and compare hashes
4. **Investigate**:
   - Was there a recent commit?
   - Is jsDelivr cache stale? (wait 10 minutes)
   - Was the file corrupted during upload?
5. **Fix**:
   - Re-run `node utils/generate_index.js`
   - Commit and push
   - Wait for CDN cache purge

### If Repository is Compromised

1. **Revoke Access**: Change GitHub password immediately
2. **Review Commits**: Check git log for unauthorized changes
3. **Revert**: `git revert` malicious commits
4. **Regenerate Hashes**: `node utils/generate_index.js`
5. **Force Push**: `git push --force origin main` (only if necessary)
6. **Notify Users**: If extension was distributed, consider emergency update

## 📈 Future Enhancements

### Planned Security Improvements

- [ ] **Code Signing**: Sign index.json with GPG key
- [ ] **Versioning**: Semantic versioning for rule updates
- [ ] **Rollback**: Automatic rollback on integrity failure
- [ ] **Telemetry**: Anonymous reporting of integrity failures (opt-in)
- [ ] **Multi-CDN**: Fallback to alternative CDNs if jsDelivr fails

### Not Planned (Out of Scope)

- ❌ Private repository (breaks jsDelivr free tier)
- ❌ Self-hosted CDN (adds infrastructure complexity)
- ❌ Dynamic rule generation (security risk)

## 📞 Support

If you encounter issues with the security system:

1. Check the [Troubleshooting](#-incident-response) section above
2. Review extension logs in Chrome DevTools
3. Email: kaydin.industries@gmail.com

---

**Last Updated**: 2025-11-24  
**Document Version**: 1.0.0

