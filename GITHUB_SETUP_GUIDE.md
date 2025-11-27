# 🚀 GitHub Repository Setup Guide

This guide walks you through setting up the `blockhub-rules` repository on GitHub.

## Prerequisites

- GitHub account: `kaydinindustries-jpg`
- Git installed on your Mac
- SSH key configured (recommended) or HTTPS access

## Step 1: Create the Repository on GitHub

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `blockhub-rules`
   - **Description**: "Rule files for BlockHub Chrome extension with SHA-256 integrity verification"
   - **Visibility**: ✅ **Public** (required for jsDelivr CDN)
   - **Initialize**: ✅ Add a README file
   - **License**: MIT License (optional)
3. Click **Create repository**

## Step 2: Clone the Repository Locally

```bash
# Using SSH (recommended)
git clone git@github.com:kaydinindustries-jpg/blockhub-rules.git

# OR using HTTPS
git clone https://github.com/kaydinindustries-jpg/blockhub-rules.git

# Navigate into the repository
cd blockhub-rules
```

## Step 3: Copy Files from Extension

```bash
# Create directory structure
mkdir -p cdn/v1

# Copy rule files
cp /Users/aydinkerem/Desktop/UniBlock/rules/cdn/v1/*.json cdn/v1/

# Copy index manifest
cp /Users/aydinkerem/Desktop/UniBlock/index.json .

# Copy README
cp /Users/aydinkerem/Desktop/UniBlock/GITHUB_REPO_README.md README.md
```

## Step 4: Commit and Push

```bash
# Add all files
git add .

# Check what will be committed
git status

# Commit
git commit -m "Initial commit: rule files with SHA-256 integrity verification"

# Push to GitHub
git push origin main
```

## Step 5: Verify jsDelivr Access

Wait 5 minutes, then test the CDN URLs:

```bash
# Test index.json
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json"

# Test a rule file
curl -s "https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/cdn/v1/kill_list.json" | head -20
```

You should see your JSON files. If you get a 404, wait a few more minutes for jsDelivr to index the repository.

## Step 6: Update Extension URLs (Already Done)

The extension is already configured to use these URLs:

```javascript
// In background.js
const INDEX_MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json';
```

## 🔐 Optional: Configure SSH Key (Recommended)

### Generate SSH Key

```bash
# Generate a new ED25519 key (more secure than RSA)
ssh-keygen -t ed25519 -C "kaydin.industries@gmail.com"

# When prompted:
# File: /Users/aydinkerem/.ssh/id_ed25519_github
# Passphrase: (choose a strong one)
```

### Add to SSH Agent

```bash
# Start the SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_ed25519_github
```

### Add to GitHub

```bash
# Copy your public key
cat ~/.ssh/id_ed25519_github.pub | pbcopy
```

Then:
1. Go to https://github.com/settings/keys
2. Click **New SSH key**
3. Title: `MacBook - BlockHub Rules`
4. Key type: Authentication Key
5. Paste the key (already in clipboard)
6. Click **Add SSH key**

### Test Connection

```bash
ssh -T git@github.com

# Should see:
# Hi kaydinindustries-jpg! You've successfully authenticated, but GitHub does not provide shell access.
```

### Update Repository to Use SSH

```bash
cd /path/to/blockhub-rules
git remote set-url origin git@github.com:kaydinindustries-jpg/blockhub-rules.git

# Verify
git remote -v
# Should show: git@github.com:kaydinindustries-jpg/blockhub-rules.git
```

## 📋 Repository Settings (Optional)

### Branch Protection

Protect the `main` branch from accidental force pushes:

1. Go to repository **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging (if working with others)
   - ✅ Require status checks to pass
5. Save changes

### Notifications

Get notified of issues and PRs:

1. Go to repository page
2. Click **Watch** → **All Activity**

## 🔄 Future Updates

Every time you update rules in the extension:

```bash
# From the extension directory
cd /Users/aydinkerem/Desktop/UniBlock

# Run the update script
./update_rules.sh

# OR manually:
cp rules/cdn/v1/*.json utils/
node utils/generate_index.js
git add .
git commit -m "Update rules: [description]"
git push origin main
```

Then copy to the GitHub repo:

```bash
# From the GitHub repo directory
cd /path/to/blockhub-rules

# Copy updated files
cp /Users/aydinkerem/Desktop/UniBlock/rules/cdn/v1/*.json cdn/v1/
cp /Users/aydinkerem/Desktop/UniBlock/index.json .

# Commit and push
git add .
git commit -m "Update rules: [description]"
git push origin main
```

## 🚨 Troubleshooting

### "Permission denied (publickey)"

Your SSH key isn't configured. Use HTTPS instead:
```bash
git remote set-url origin https://github.com/kaydinindustries-jpg/blockhub-rules.git
```

### "Repository not found"

Check the repository name and your access:
```bash
git remote -v
# Should show: kaydinindustries-jpg/blockhub-rules
```

### jsDelivr Returns 404

Wait 5-10 minutes after pushing. jsDelivr needs time to index new repositories.

### Files Not Updating on CDN

jsDelivr caches files. Purge the cache:
- Visit: `https://purge.jsdelivr.net/gh/kaydinindustries-jpg/blockhub-rules@main/index.json`
- Or wait 24 hours for automatic cache expiration

## ✅ Verification Checklist

- [ ] Repository created on GitHub (public)
- [ ] Files copied and pushed to `main` branch
- [ ] jsDelivr URLs accessible (wait 5 minutes)
- [ ] Extension loads rules from CDN successfully
- [ ] Integrity verification passes (check extension logs)
- [ ] SSH key configured (optional but recommended)
- [ ] Update workflow tested

## 📞 Need Help?

- **GitHub Docs**: https://docs.github.com
- **jsDelivr Docs**: https://www.jsdelivr.com/documentation
- **Email**: kaydin.industries@gmail.com

---

**Last Updated**: 2025-11-24  
**For**: BlockHub Extension v0.1.1+

