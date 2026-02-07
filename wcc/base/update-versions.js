const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const clearFlagIndex = args.indexOf('--clear');
let shouldClear = false;

if (clearFlagIndex !== -1) {
  shouldClear = true;
  args.splice(clearFlagIndex, 1); // Remove the flag from args
}

const filePath = args[0];

if (!filePath) {
  console.error('Usage: node wcc/base/update-versions.js <file> [--clear]');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');

let newContent;

// Function to check if the script is a WCC component
const isWccComponent = (src) => {
  // Normalize slashes to forward slashes for consistent checking
  const normalizedSrc = src.replace(/\\/g, '/');

  // 1. Check for BaseComponent specifically
  if (normalizedSrc.includes('wcc/base/BaseComponent.js')) {
    return true;
  }

  // 2. Check if directory starts with wcc and filename matches directory name
  // Split path into parts
  const parts = normalizedSrc.split('/');

  // Need at least 2 parts (dir/file.js)
  if (parts.length < 2) return false;

  const filename = parts[parts.length - 1];
  const parentDir = parts[parts.length - 2];

  // Check if it's inside a 'wcc' directory structure
  // Check if any directory in the path starts with 'wcc'
  // Example: wcc/Comp.js, wcc-sections/Comp.js, lib/wcc-ui/Comp.js
  let hasWccDir = false;

  // Check start of path
  if (normalizedSrc.startsWith('wcc')) {
    hasWccDir = true;
  } else {
    // Check middle of path
    const pathParts = normalizedSrc.split('/');
    // Iterate all parts except the last one (filename)
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i].startsWith('wcc')) {
        hasWccDir = true;
        break;
      }
    }
  }

  if (hasWccDir) {
    // Remove extension from filename
    const nameWithoutExt = filename.replace(/\.js$/, '');
    if (nameWithoutExt === parentDir) {
      return true;
    }
  }

  return false;
};

if (shouldClear) {
  console.log('Clearing versions...');
  newContent = content.replace(
    /(<script\s+[^>]*src=["'])([^"']+\.js)(?:\?v=[a-zA-Z0-9_.-]+)?(["'])/gi,
    (match, prefix, src, suffix) => {
      if (isWccComponent(src)) {
        return `${prefix}${src}${suffix}`;
      }
      return match;
    }
  );
} else {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-3);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const version = `${year}${month}${day}`;

  console.log(`Setting version to: ${version}`);

  newContent = content.replace(
    /(<script\s+[^>]*src=["'])([^"']+\.js)(?:\?v=[a-zA-Z0-9_.-]+)?(["'])/gi,
    (match, prefix, src, suffix) => {
      if (isWccComponent(src)) {
        return `${prefix}${src}?v=${version}${suffix}`;
      }
      return match;
    }
  );
}

fs.writeFileSync(absolutePath, newContent, 'utf8');
console.log(`Updated versions in ${path.basename(filePath)}`);
