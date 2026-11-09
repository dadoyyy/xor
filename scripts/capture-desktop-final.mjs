import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const currentDir = path.resolve("tests/visual/current-desktop");
const baselineDir = path.resolve("tests/visual/baseline");
const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";
if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir, { recursive: true });

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData?.user?.email,
});

const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anonClient.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});

const cookiesToSet = [];
const ssr = createServerClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [],
    setAll: (c) => cookiesToSet.push(...c),
  },
});
await ssr.auth.setSession(sessionData.session);

const playwrightCookies = cookiesToSet.map((c) => ({
  name: c.name,
  value: c.value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));

const BASE_URL = "http://localhost:3000";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-lcd-text"],
});

const targets = [
  { width: 1440, height: 900, scene: "morning", name: "home_1440x900_morning.png" },
  { width: 1440, height: 900, scene: "afternoon", name: "home_1440x900_afternoon.png" },
  { width: 1440, height: 900, scene: "evening", name: "home_1440x900_evening.png" },
  { width: 768, height: 1024, scene: "morning", name: "home_768x1024_morning.png" },
  { width: 768, height: 1024, scene: "afternoon", name: "home_768x1024_afternoon.png" },
  { width: 768, height: 1024, scene: "evening", name: "home_768x1024_evening.png" },
  { width: 1024, height: 768, scene: "afternoon", name: "home_1024x768_afternoon.png" },
  { width: 1366, height: 768, scene: "afternoon", name: "home_1366x768_afternoon.png" },
  { width: 1920, height: 1080, scene: "afternoon", name: "home_1920x1080_afternoon.png" },
];

console.log("Capturing desktop & tablet screenshots...");

for (const t of targets) {
  const context = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: 1,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/home?scene=${t.scene}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-home-hero="true"]');
  await page.waitForTimeout(400);

  const outPath = path.join(currentDir, t.name);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved ${t.name}`);

  // Copy to brain artifacts
  fs.copyFileSync(outPath, path.join(artifactDir, t.name));

  await context.close();
}

await browser.close();

console.log("\nGenerating side-by-side comparison images for review...");

async function makeComparison(baseFile, currFile, label, outFile) {
  const basePath = path.join(baselineDir, baseFile);
  const currPath = path.join(currentDir, currFile);

  if (!fs.existsSync(basePath) || !fs.existsSync(currPath)) {
    console.warn("Missing file for compare:", basePath, currPath);
    return;
  }

  const baseMeta = await sharp(basePath).metadata();
  const currMeta = await sharp(currPath).metadata();

  const width = Math.min(baseMeta.width, currMeta.width);
  const height = Math.min(baseMeta.height, currMeta.height);

  // Resize both to identical crop if needed
  const baseBuf = await sharp(basePath).resize(width, height).toBuffer();
  const currBuf = await sharp(currPath).resize(width, height).toBuffer();

  const compWidth = width * 2 + 20; // 20px middle divider
  const compHeight = height + 60; // 60px header for label

  // Create composite
  const svgBanner = `
    <svg width="${compWidth}" height="60">
      <rect width="${compWidth}" height="60" fill="#2B1B5A" />
      <text x="30" y="38" font-family="sans-serif" font-size="20" font-weight="bold" fill="#FED770">OLD BASELINE (${label})</text>
      <text x="${width + 40}" y="38" font-family="sans-serif" font-size="20" font-weight="bold" fill="#7C4DFF">NEW COMPOSITION (Clean Left Zone, Books Left of Cottage, Corgi Right)</text>
    </svg>
  `;

  await sharp({
    create: {
      width: compWidth,
      height: compHeight,
      channels: 4,
      background: { r: 238, g: 233, b: 247, alpha: 1 },
    },
  })
    .composite([
      { input: Buffer.from(svgBanner), left: 0, top: 0 },
      { input: baseBuf, left: 0, top: 60 },
      { input: currBuf, left: width + 20, top: 60 },
    ])
    .png()
    .toFile(path.join(artifactDir, outFile));

  console.log(`Generated comparison: ${outFile}`);
}

await makeComparison(
  "home_1440x900_morning.png",
  "home_1440x900_morning.png",
  "Morning 1440x900",
  "compare_1440x900_morning.png"
);
await makeComparison(
  "home_1440x900_afternoon.png",
  "home_1440x900_afternoon.png",
  "Afternoon 1440x900",
  "compare_1440x900_afternoon.png"
);
await makeComparison(
  "home_1440x900_evening.png",
  "home_1440x900_evening.png",
  "Evening 1440x900",
  "compare_1440x900_evening.png"
);
await makeComparison(
  "home_768x1024_afternoon.png",
  "home_768x1024_afternoon.png",
  "Tablet 768x1024",
  "compare_768x1024_afternoon.png"
);

console.log("\nAll desktop screenshots and comparisons successfully captured!");

