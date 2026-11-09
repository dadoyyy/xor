import fs from "fs";

function auditPolicies(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  console.log(`\n=== Auditing ${filePath} (${lines.length} lines) ===`);

  // 1. Look for lines starting with 'using' or 'with check' that aren't preceded by CREATE POLICY
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("using (") || line.startsWith("with check (")) {
      // Look backwards up to 5 lines for create policy
      let foundPolicy = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = lines[j].trim();
        if (prev.endsWith(";")) {
          // If previous non-empty line ends with semicolon, this might be dangling!
          console.log(`Suspicious dangling clause at line ${i + 1}:`);
          console.log(`  Line ${j + 1}: ${prev}`);
          console.log(`  Line ${i + 1}: ${line}`);
          break;
        }
        if (prev.toLowerCase().includes("create policy")) {
          foundPolicy = true;
          break;
        }
      }
    }
  }

  // 2. Parse all CREATE POLICY blocks
  const policyRegex = /create\s+policy\s+"([^"]+)"\s+on\s+([^\s]+)\s+(?:as\s+\w+\s+)?for\s+(\w+)([\s\S]*?);/gi;
  let match;
  while ((match = policyRegex.exec(content)) !== null) {
    const name = match[1];
    const table = match[2];
    const cmd = match[3].toLowerCase();
    const body = match[4];

    const hasUsing = /\busing\s*\(/i.test(body);
    const hasWithCheck = /\bwith\s+check\s*\(/i.test(body);

    if (cmd === "insert" && hasUsing) {
      console.log(`ERROR: Policy "${name}" on ${table} is FOR INSERT but has USING clause!`);
    }
    if (cmd === "insert" && !hasWithCheck) {
      console.log(`WARNING: Policy "${name}" on ${table} is FOR INSERT but has no WITH CHECK clause!`);
    }
    if (cmd === "delete" && hasWithCheck) {
      console.log(`ERROR: Policy "${name}" on ${table} is FOR DELETE but has WITH CHECK clause!`);
    }
    if (cmd === "select" && hasWithCheck) {
      console.log(`ERROR: Policy "${name}" on ${table} is FOR SELECT but has WITH CHECK clause!`);
    }
  }
}

auditPolicies("supabase/migrations/005_user_first_subjects.sql");
auditPolicies("supabase/migrations/005_user_first_subjects_down.sql");
auditPolicies("supabase/schema.sql");

