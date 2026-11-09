import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else if (/\.(tsx|ts|js|mjs|json|css|md)$/.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

const emojiRegex = /\p{Extended_Pictographic}/u;
const files = walk('.');

const found = [];
files.forEach(f => {
  // Ignore our own search script and git artifacts
  if (f.includes('find-all-emojis') || f.includes('.system_generated')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      found.push({
        file: f.replace(/\\/g, '/'),
        line: idx + 1,
        match: line.match(/\p{Extended_Pictographic}/u)[0],
        text: line.trim()
      });
    }
  });
});

console.log('Repo-wide emoji occurrences:', found.length);
found.forEach(item => {
  console.log(`${item.file}:${item.line} [${item.match}] -> ${item.text}`);
});
