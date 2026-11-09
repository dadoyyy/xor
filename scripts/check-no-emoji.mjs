import fs from "node:fs";
import path from "node:path";

// Extended emoji regex covering Emoticons, Misc Pictographs, Transport/Map, Alchemical, Supplemental symbols
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA00}-\u{1FAFF}]/gu;

const TARGET_DIRS = ["apps/web/src"];
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".html"]);
const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "dist"]);

let foundErrors = 0;

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scan(full);
      }
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      const code = fs.readFileSync(full, "utf-8");
      const lines = code.split("\n");
      lines.forEach((line, idx) => {
        const matches = [...line.matchAll(EMOJI_REGEX)];
        if (matches.length > 0) {
          const emojis = matches.map((m) => m[0]).join(" ");
          console.error(
            `\x1b[31m[NO-EMOJI VIOLATION]\x1b[0m ${full}:${idx + 1} contains emoji [${emojis}]`
          );
          foundErrors++;
        }
      });
    }
  }
}

for (const d of TARGET_DIRS) {
  scan(d);
}

if (foundErrors > 0) {
  console.error(
    `\n\x1b[31mFailed: Found ${foundErrors} emoji occurrence(s). Use Lucide icons or <Mascot /> instead.\x1b[0m\n`
  );
  process.exit(1);
} else {
  console.log(
    "\x1b[32m✔ No-emoji audit passed: Zero emojis found in UI application code.\x1b[0m"
  );
  process.exit(0);
}

