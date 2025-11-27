/**
 * EasyList to Declarative Net Request (DNR) Converter
 * 
 * Converts EasyList filter syntax to Chrome Manifest V3 DNR format.
 * Handles domain rules, regex patterns, exceptions, and resource types.
 * 
 * Usage: node easylist_converter.js <input_file> <output_file>
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse EasyList filter syntax and convert to DNR rules
 */
class EasyListConverter {
  constructor() {
    this.rules = [];
    this.ruleId = 1;
    this.duplicateCheck = new Set();
  }

  /**
   * Parse a single filter line
   * @param {string} line - Filter line from EasyList
   * @returns {Object|null} DNR rule object or null if invalid
   */
  parseFilter(line) {
    // Skip comments and empty lines
    if (!line || line.startsWith('!') || line.startsWith('[')) {
      return null;
    }

    line = line.trim();
    if (!line) return null;

    // Skip element hiding rules (handled by content scripts)
    if (line.includes('##') || line.includes('#@#')) {
      return null;
    }

    // Check if it's an exception rule (@@)
    const isException = line.startsWith('@@');
    if (isException) {
      line = line.substring(2);
    }

    // Parse options (e.g., $script,third-party)
    let options = {};
    const optionsIndex = line.lastIndexOf('$');
    if (optionsIndex !== -1) {
      const optionsStr = line.substring(optionsIndex + 1);
      line = line.substring(0, optionsIndex);
      options = this.parseOptions(optionsStr);
    }

    // Skip unsupported options
    if (options.unsupported) {
      return null;
    }

    // Convert filter pattern to DNR format
    const rule = this.convertPattern(line, isException, options);
    return rule;
  }

  /**
   * Parse filter options
   * @param {string} optionsStr - Options string (e.g., "script,third-party")
   * @returns {Object} Parsed options
   */
  parseOptions(optionsStr) {
    const options = {
      resourceTypes: [],
      domainConditions: [],
      thirdParty: null
    };

    const parts = optionsStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      
      // Resource types
      if (trimmed === 'script') options.resourceTypes.push('script');
      else if (trimmed === 'image') options.resourceTypes.push('image');
      else if (trimmed === 'stylesheet') options.resourceTypes.push('stylesheet');
      else if (trimmed === 'xmlhttprequest') options.resourceTypes.push('xmlhttprequest');
      else if (trimmed === 'subdocument') options.resourceTypes.push('sub_frame');
      else if (trimmed === 'ping') options.resourceTypes.push('ping');
      else if (trimmed === 'media') options.resourceTypes.push('media');
      else if (trimmed === 'font') options.resourceTypes.push('font');
      else if (trimmed === 'websocket') options.resourceTypes.push('websocket');
      else if (trimmed === 'other') options.resourceTypes.push('other');
      
      // Third-party
      else if (trimmed === 'third-party') options.thirdParty = true;
      else if (trimmed === '~third-party') options.thirdParty = false;
      
      // Domain conditions
      else if (trimmed.startsWith('domain=')) {
        const domains = trimmed.substring(7).split('|');
        options.domainConditions = domains;
      }
      
      // Unsupported options - skip this rule
      else if (['popup', 'document', 'elemhide', 'generichide', 'genericblock'].includes(trimmed)) {
        options.unsupported = true;
      }
    }

    // Default resource types if none specified
    if (options.resourceTypes.length === 0) {
      options.resourceTypes = [
        'main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
        'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'
      ];
    }

    return options;
  }

  /**
   * Convert filter pattern to DNR format
   * @param {string} pattern - Filter pattern
   * @param {boolean} isException - Whether this is an exception rule
   * @param {Object} options - Parsed options
   * @returns {Object|null} DNR rule or null
   */
  convertPattern(pattern, isException, options) {
    let urlFilter = null;
    let regexFilter = null;
    let isUrlFilterCaseSensitive = false;

    // Handle different pattern types
    if (pattern.startsWith('||')) {
      // Domain anchor: ||example.com^
      urlFilter = pattern.substring(2);
    } else if (pattern.startsWith('|')) {
      // Start anchor: |http://example.com
      urlFilter = pattern.substring(1);
    } else if (pattern.endsWith('|')) {
      // End anchor: example.com|
      urlFilter = pattern.substring(0, pattern.length - 1);
    } else if (pattern.includes('*') || pattern.includes('^')) {
      // Wildcard or separator - use as urlFilter with wildcards
      urlFilter = pattern;
    } else if (pattern.includes('/') && pattern.match(/[a-zA-Z0-9]/)) {
      // Regular pattern
      urlFilter = pattern;
    } else {
      // Simple domain pattern
      urlFilter = pattern;
    }

    // Clean up pattern
    if (urlFilter) {
      // Replace separator (^) with wildcard for DNR
      urlFilter = urlFilter.replace(/\^/g, '*');
      
      // Remove trailing wildcards
      urlFilter = urlFilter.replace(/\*+$/, '');
      
      // Simplify multiple wildcards
      urlFilter = urlFilter.replace(/\*+/g, '*');
      
      // Remove leading wildcard if followed by domain
      if (urlFilter.startsWith('*') && !urlFilter.startsWith('*.')) {
        urlFilter = urlFilter.substring(1);
      }
    }

    // Skip invalid patterns
    if (!urlFilter || urlFilter.length < 3) {
      return null;
    }

    // Check for duplicates
    const ruleKey = `${urlFilter}:${isException}:${options.resourceTypes.join(',')}`;
    if (this.duplicateCheck.has(ruleKey)) {
      return null;
    }
    this.duplicateCheck.add(ruleKey);

    // Build DNR rule
    const rule = {
      id: this.ruleId++,
      priority: isException ? 2 : 1,
      action: {
        type: isException ? 'allow' : 'block'
      },
      condition: {
        resourceTypes: options.resourceTypes
      }
    };

    // Add URL filter or regex filter
    if (regexFilter) {
      rule.condition.regexFilter = regexFilter;
      rule.condition.isUrlFilterCaseSensitive = isUrlFilterCaseSensitive;
    } else {
      rule.condition.urlFilter = urlFilter;
    }

    // Add domain conditions if present
    if (options.domainConditions.length > 0) {
      const initiatorDomains = [];
      const excludedInitiatorDomains = [];
      
      for (const domain of options.domainConditions) {
        if (domain.startsWith('~')) {
          excludedInitiatorDomains.push(domain.substring(1));
        } else {
          initiatorDomains.push(domain);
        }
      }
      
      if (initiatorDomains.length > 0) {
        rule.condition.initiatorDomains = initiatorDomains;
      }
      if (excludedInitiatorDomains.length > 0) {
        rule.condition.excludedInitiatorDomains = excludedInitiatorDomains;
      }
    }

    return rule;
  }

  /**
   * Convert EasyList file to DNR rules
   * @param {string} inputPath - Path to EasyList file
   * @returns {Array} Array of DNR rules
   */
  convertFile(inputPath) {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const lines = content.split('\n');

    console.log(`Processing ${lines.length} lines from ${inputPath}...`);

    for (const line of lines) {
      const rule = this.parseFilter(line);
      if (rule) {
        this.rules.push(rule);
      }
    }

    console.log(`Generated ${this.rules.length} DNR rules`);
    return this.rules;
  }

  /**
   * Validate rules against Chrome DNR schema
   * @param {Array} rules - Array of DNR rules
   * @returns {Array} Valid rules
   */
  validateRules(rules) {
    const validRules = [];
    
    for (const rule of rules) {
      // Check required fields
      if (!rule.id || !rule.action || !rule.condition) {
        console.warn(`Skipping invalid rule (missing required fields):`, rule);
        continue;
      }

      // Check action type
      if (!['block', 'allow', 'redirect', 'upgradeScheme'].includes(rule.action.type)) {
        console.warn(`Skipping rule with invalid action type:`, rule.action.type);
        continue;
      }

      // Check condition has at least one matcher
      if (!rule.condition.urlFilter && !rule.condition.regexFilter) {
        console.warn(`Skipping rule without URL or regex filter:`, rule);
        continue;
      }

      // Check resource types are valid
      const validResourceTypes = [
        'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
        'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket',
        'webtransport', 'webbundle', 'other'
      ];
      
      if (rule.condition.resourceTypes) {
        const invalidTypes = rule.condition.resourceTypes.filter(
          type => !validResourceTypes.includes(type)
        );
        if (invalidTypes.length > 0) {
          console.warn(`Skipping rule with invalid resource types:`, invalidTypes);
          continue;
        }
      }

      validRules.push(rule);
    }

    console.log(`Validated ${validRules.length} rules (${rules.length - validRules.length} invalid)`);
    return validRules;
  }

  /**
   * Save rules to JSON file
   * @param {string} outputPath - Output file path
   * @param {Array} rules - DNR rules to save
   */
  saveRules(outputPath, rules) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(rules, null, 2));
    console.log(`Saved ${rules.length} rules to ${outputPath}`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node easylist_converter.js <input_file> <output_file>');
    console.log('Example: node easylist_converter.js easylist.txt ../rules/ads_static.json');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const converter = new EasyListConverter();
  const rules = converter.convertFile(inputPath);
  const validRules = converter.validateRules(rules);
  converter.saveRules(outputPath, validRules);

  console.log('\nConversion complete!');
}

module.exports = EasyListConverter;

