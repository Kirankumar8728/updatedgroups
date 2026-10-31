const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  // Regex to find value={...} inside input, textarea, or select
  const matches = content.matchAll(/<(input|textarea|select)[^>]*\bvalue=\{([^}]+)\}/gs);
  for (const match of matches) {
    const tag = match[1];
    const expr = match[2].trim();
    if (
      !expr.includes("|| ''") &&
      !expr.includes("?? ''") &&
      !expr.includes('|| ""') &&
      !expr.includes('?? ""') &&
      !expr.includes('toString()') &&
      !expr.includes('String(') &&
      !expr.startsWith('"') &&
      !expr.startsWith("'") &&
      !/^\d+$/.test(expr) &&
      !/^(true|false)$/.test(expr)
    ) {
      console.log(`[SUSPECT] ${f} <${tag}> value={${expr}}`);
    }
  }
});
