#!/usr/bin/env node
/**
 * Generate index.json with SHA-256 hashes for all rule files
 * 
 * This script computes cryptographic hashes of all rule files to ensure
 * integrity when fetching from the CDN. The extension will verify these
 * hashes before applying any rules.
 * 
 * Usage: node utils/generate_index.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// GitHub repository configuration
const REPO_OWNER = 'kaydinindustries-jpg';
const REPO_NAME = 'blockhub-rules';
const BRANCH = 'main';

// Rule files to include in the index
const FILES = {
  aiTerms: 'cdn/v1/ai_terms.json',
  aiWidgetSelectors: 'cdn/v1/ai_widget_selectors.json',
  cookiePatterns: 'cdn/v1/cookie_patterns.json',
  killList: 'cdn/v1/kill_list.json',
  preserveList: 'cdn/v1/preserve_list.json'
};

/**
 * Compute SHA-256 hash of a file
 */
function computeSHA256(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Generate the index manifest
 */
function generateIndex() {
  console.log('🔐 Generating index.json with SHA-256 hashes...\n');

  const index = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    files: {}
  };

  for (const [key, relativePath] of Object.entries(FILES)) {
    const fullPath = path.join(__dirname, '..', 'rules', relativePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }

    const sha256 = computeSHA256(fullPath);
    const size = getFileSize(fullPath);
    const url = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}/${relativePath}`;

    index.files[key] = {
      url,
      sha256,
      size
    };

    console.log(`✓ ${key.padEnd(20)} ${sha256.substring(0, 16)}... (${size} bytes)`);
  }

  return index;
}

/**
 * Main execution
 */
function main() {
  try {
    // Generate index
    const index = generateIndex();
    
    // Save to root directory
    const outputPath = path.join(__dirname, '..', 'index.json');
    fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
    
    console.log(`\n✅ Index generated successfully: ${outputPath}`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Review the generated index.json`);
    console.log(`   2. Commit all files to your GitHub repository`);
    console.log(`   3. Push to the '${BRANCH}' branch`);
    console.log(`   4. Wait 5-10 minutes for jsDelivr CDN to update`);
    console.log(`   5. The extension will automatically verify hashes on next fetch\n`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();

