#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredPaths = [
  "apps/web/src/features",
  "apps/mobile/src/features",
  "apps/mobile/android",
  "apps/mobile/app.json",
  "apps/mobile/eas.json",
  "apps/backend/src/modules",
  "apps/agent",
  "packages/shared-types",
  "packages/shared-utils",
  "packages/api-client",
  "packages/design-tokens",
  "packages/config",
  "docs",
  "scripts",
  ".github/workflows",
];

let ok = true;
for (const p of requiredPaths) {
  if (!existsSync(resolve(process.cwd(), p))) {
    console.error(`Missing required monorepo path: ${p}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("All monorepo directories verified.");

