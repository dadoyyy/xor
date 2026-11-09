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
const issues = [];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match entire opening tags for button, a, Link
  const tagRegex = /<(button|a|Link)\b([\s\S]*?)>/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1];
    const attrs = match[2];
    
    // Check if it's styled as a button or has btn / onClick / role="tab" / role="button"
    const hasBtn = attrs.includes('btn') || attrs.includes('role="button"') || attrs.includes('role="tab"');
    const isActualButton = tag === 'button';
    
    if (hasBtn || isActualButton) {
      const radiusMatch = attrs.match(/rounded-(md|lg|xl|2xl|3xl|\[\d+px\])/);
      if (radiusMatch) {
        // Calculate line number
        const upToMatch = content.slice(0, match.index);
        const lineNum = upToMatch.split('\n').length;
        issues.push({
          file: filePath.replace(/\\/g, '/'),
          line: lineNum,
          tag,
          radius: radiusMatch[0],
          snippet: match[0].replace(/\s+/g, ' ').slice(0, 120)
        });
      }
    }
  }
});

console.log('Multiline Tag Button hardcoded radius findings:', issues.length);
issues.forEach(iss => {
  console.log(`${iss.file}:${iss.line} <${iss.tag}> [${iss.radius}] -> ${iss.snippet}`);
});
