#!/usr/bin/env node
/**
 * Test script to verify SHA-256 integrity verification system
 * Simulates the extension's hash verification process
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function computeSHA256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function testIntegrity() {
  log('\n🔐 BlockHub Integrity Verification Test', 'cyan');
  log('=' .repeat(50), 'cyan');
  log('');

  // Load index.json
  const indexPath = path.join(__dirname, 'index.json');
  if (!fs.existsSync(indexPath)) {
    log('❌ index.json not found!', 'red');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  log(`📋 Index version: ${index.version}`, 'blue');
  log(`📅 Last updated: ${index.lastUpdated}`, 'blue');
  log('');

  let allPassed = true;
  let totalFiles = 0;
  let passedFiles = 0;

  // Test each file
  for (const [category, fileInfo] of Object.entries(index.files)) {
    totalFiles++;
    const relativePath = fileInfo.url.split('/cdn/v1/')[1];
    const filePath = path.join(__dirname, 'rules', 'cdn', 'v1', relativePath);

    log(`Testing ${category}...`, 'yellow');
    log(`  File: ${relativePath}`);

    if (!fs.existsSync(filePath)) {
      log(`  ❌ File not found: ${filePath}`, 'red');
      allPassed = false;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const computedHash = computeSHA256(content);
    const expectedHash = fileInfo.sha256;

    log(`  Expected: ${expectedHash.substring(0, 32)}...`);
    log(`  Computed: ${computedHash.substring(0, 32)}...`);

    if (computedHash === expectedHash) {
      log(`  ✅ PASS - Integrity verified`, 'green');
      passedFiles++;
    } else {
      log(`  ❌ FAIL - Hash mismatch!`, 'red');
      allPassed = false;
    }

    log('');
  }

  // Summary
  log('=' .repeat(50), 'cyan');
  log(`📊 Results: ${passedFiles}/${totalFiles} files passed`, 'cyan');
  
  if (allPassed) {
    log('✅ All integrity checks PASSED', 'green');
    log('');
    log('🎉 The security system is working correctly!', 'green');
    log('   Your rules are protected against tampering.', 'green');
  } else {
    log('❌ Some integrity checks FAILED', 'red');
    log('');
    log('⚠️  Action required:', 'yellow');
    log('   1. Regenerate index.json: node utils/generate_index.js', 'yellow');
    log('   2. Verify file contents are correct', 'yellow');
    log('   3. Re-run this test', 'yellow');
  }

  log('');
  return allPassed;
}

// Run test
const success = testIntegrity();
process.exit(success ? 0 : 1);

