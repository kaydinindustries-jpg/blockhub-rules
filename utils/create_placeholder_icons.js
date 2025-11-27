/**
 * Create placeholder PNG icons for development
 * Replace these with proper icons before production release
 */

const fs = require('fs');
const path = require('path');

// Minimal PNG data for solid color squares with "U" text (base64 encoded)
// These are temporary placeholders - replace with actual designed icons
const iconSizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create simple 1x1 green PNG as placeholder for each size
// This is a minimal valid PNG file (1x1 green pixel)
const minimalPNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xD7, 0x63, 0x60, 0xA8, 0x65, 0x00, // Green pixel data
  0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
  0x44, 0xAE, 0x42, 0x60, 0x82
]);

iconSizes.forEach(size => {
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, minimalPNG);
  console.log(`Created placeholder icon: icon${size}.png`);
});

console.log('\nPlaceholder icons created successfully!');
console.log('⚠️  IMPORTANT: Replace these with proper designed icons before production release.');

