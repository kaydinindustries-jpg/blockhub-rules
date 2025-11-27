#!/bin/bash

# Uniblock Installation Verification Script
# Checks that all required files are present and valid

echo "=========================================="
echo "Uniblock Installation Verification"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ((FAILED++))
        return 1
    fi
}

# Function to check JSON validity
check_json() {
    if command -v python3 &> /dev/null; then
        if python3 -c "import json; json.load(open('$1'))" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $1 (valid JSON)"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}✗${NC} $1 (INVALID JSON)"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} $1 (cannot validate - python3 not found)"
        ((WARNINGS++))
        return 0
    fi
}

echo "Checking core files..."
check_file "manifest.json"
check_file "background.js"
check_file "package.json"
check_file "LICENSE"
check_file ".gitignore"

echo ""
echo "Checking documentation..."
check_file "README.md"
check_file "CHANGELOG.md"
check_file "QUICKSTART.md"
check_file "CHROME_WEB_STORE.md"
check_file "PROJECT_SUMMARY.md"

echo ""
echo "Checking directories..."
check_dir "content"
check_dir "ui"
check_dir "rules"
check_dir "utils"
check_dir "tests"
check_dir "assets"
check_dir "assets/icons"

echo ""
echo "Checking content scripts..."
check_file "content/shared.js"
check_file "content/cookies.js"
check_file "content/ai_widgets.js"
check_file "content/ai_terms.js"

echo ""
echo "Checking UI files..."
check_file "ui/popup.html"
check_file "ui/popup.js"
check_file "ui/popup.css"

echo ""
echo "Checking rules..."
check_file "rules/ads_static.json"
check_file "rules/trackers_static.json"

echo ""
echo "Checking utilities..."
check_file "utils/easylist_converter.js"
check_file "utils/ai_terms.json"
check_file "utils/stoplist.json"
check_file "utils/create_placeholder_icons.js"

echo ""
echo "Checking tests..."
check_file "tests/integration.test.js"

echo ""
echo "Checking icons..."
check_file "assets/icons/icon16.png"
check_file "assets/icons/icon32.png"
check_file "assets/icons/icon48.png"
check_file "assets/icons/icon128.png"

echo ""
echo "Validating JSON files..."
check_json "manifest.json"
check_json "package.json"
check_json "rules/ads_static.json"
check_json "rules/trackers_static.json"
check_json "utils/ai_terms.json"
check_json "utils/stoplist.json"

echo ""
echo "=========================================="
echo "Verification Results"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed:${NC} $FAILED"
fi
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Installation verification PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Replace placeholder icons in assets/icons/"
    echo "2. Load extension in Chrome (chrome://extensions/)"
    echo "3. Test on real websites"
    echo "4. Review QUICKSTART.md for usage instructions"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Installation verification FAILED${NC}"
    echo ""
    echo "Please ensure all required files are present."
    echo "See PROJECT_SUMMARY.md for complete file list."
    echo ""
    exit 1
fi

