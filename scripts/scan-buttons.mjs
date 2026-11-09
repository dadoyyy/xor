import fs from 'fs';
import path from 'path';

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

const files = walk('apps/web/src');
console.log('Total files checked:', files.length);

const occurrences = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (
      trimmed.includes('<button') ||
      trimmed.includes('role="button"') ||
      trimmed.includes('.btn') ||
      trimmed.includes('btn-') ||
      trimmed.includes('rounded-[10px]') ||
      trimmed.includes('rounded-[8px]') ||
      trimmed.includes('rounded-[12px]') ||
      trimmed.includes('rounded-lg') ||
      trimmed.includes('rounded-md') ||
      trimmed.includes('rounded-xl')
    ) {
      occurrences.push({
        file: f.replace(/\\/g, '/'),
        line: idx + 1,
        text: trimmed
      });
    }
  });
});

console.log('Total matches found:', occurrences.length);
if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });
fs.writeFileSync('scratch/button-scan.json', JSON.stringify(occurrences, null, 2));

// Print summary by file
const byFile = {};
occurrences.forEach(o => {
  byFile[o.file] = (byFile[o.file] || 0) + 1;
});
console.log('Matches by file:');
Object.entries(byFile).forEach(([file, count]) => {
  console.log(`  ${count.toString().padStart(3)}: ${file}`);
});

