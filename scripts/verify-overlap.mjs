import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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

const widths = [768, 1024, 1280, 1366, 1440, 1600, 1920];
const results = [];

for (const width of widths) {
  const height = width >= 1024 ? 900 : 1024;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/home?scene=afternoon`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-home-hero="true"]');
  // Wait a moment for layout stabilization
  await page.waitForTimeout(300);

  const heroBox = await page.locator('[data-home-hero="true"]').boundingBox();
  const textBox = await page.locator('[data-text-zone="true"]').boundingBox();
  const leftButtonsBox = await page.locator('[data-left-buttons="true"]').boundingBox();
  const corgiBox = await page.locator('[data-desktop-corgi="true"]').boundingBox();
  const ctaBox = await page.locator('[data-cta-button="true"]').boundingBox();

  // Nearest left elements right edge:
  const textRight = Math.max(
    textBox ? textBox.x + textBox.width : 0,
    leftButtonsBox ? leftButtonsBox.x + leftButtonsBox.width : 0
  );

  // Corgi clearance
  const corgiClearance = corgiBox ? corgiBox.x - textRight : 999;

  // Cottage bounding box if present
  let cottageBox = null;
  const cottageEl = page.locator('[data-cottage="true"]');
  if (await cottageEl.count() > 0) {
    cottageBox = await cottageEl.boundingBox();
  }

  // Books bounding box if visible
  let booksBox = null;
  const booksEl = page.locator('[data-books="true"]');
  if (await booksEl.count() > 0 && await booksEl.isVisible()) {
    booksBox = await booksEl.boundingBox();
  }

  if (width === 1440 || width === 768 || width === 1024) {
    console.log(`DEBUG ${width} boxes:`, {
      heroBox,
      textBox,
      leftButtonsBox,
      corgiBox,
      ctaBox,
      cottageBox,
      booksBox,
      textRight,
      corgiClearance,
    });
  }

  // Nearest artwork to text/buttons
  const artworkLefts = [];
  if (booksBox) artworkLefts.push(booksBox.x);
  if (cottageBox) artworkLefts.push(cottageBox.x);
  if (corgiBox) artworkLefts.push(corgiBox.x);
  const nearestArtworkLeft = artworkLefts.length > 0 ? Math.min(...artworkLefts) : 9999;
  const artworkClearance = nearestArtworkLeft - textRight;

  // CTA clearance to Corgi
  let ctaClearanceCorgi = 999;
  if (ctaBox && corgiBox) {
    // vertical separation (CTA is top, Corgi is bottom)
    const vertSeparation = corgiBox.y - (ctaBox.y + ctaBox.height);
    ctaClearanceCorgi = vertSeparation;
  }

  // Corgi clipping check
  let corgiClipped = false;
  if (heroBox && corgiBox) {
    if (
      corgiBox.x < heroBox.x ||
      corgiBox.x + corgiBox.width > heroBox.x + heroBox.width + 2 ||
      corgiBox.y < heroBox.y ||
      corgiBox.y + corgiBox.height > heroBox.y + heroBox.height + 2
    ) {
      corgiClipped = true;
    }
  }

  // Books overlap text check
  let booksOverlapText = false;
  if (booksBox && booksBox.x < textRight) {
    booksOverlapText = true;
  }

  results.push({
    width,
    cardWidth: Math.round(heroBox ? heroBox.width : 0),
    textZoneMaxX: Math.round(textRight),
    artworkClearance: Math.round(artworkClearance),
    corgiClearance: Math.round(corgiClearance),
    ctaClearanceCorgi: Math.round(ctaClearanceCorgi),
    corgiClipped,
    booksHidden: !booksBox,
    booksOverlapText,
    pass: artworkClearance >= 24 && corgiClearance >= 24 && ctaClearanceCorgi >= 24 && !corgiClipped && !booksOverlapText,
  });

  await context.close();
}

await browser.close();

console.log("\n=== DESKTOP & TABLET OVERLAP & CLEARANCE VERIFICATION ===");
console.log(
  "| Width | Card Width | Nearest Art Clearance (>=24px) | Corgi Clearance (>=24px) | CTA-Corgi Vert Sep | Books Hidden | Corgi Clipped | Pass |"
);
console.log(
  "| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |"
);
for (const r of results) {
  console.log(
    `| ${r.width}px | ${r.cardWidth}px | ${r.artworkClearance}px | ${r.corgiClearance}px | ${r.ctaClearanceCorgi}px | ${r.booksHidden ? "Yes (tablet)" : "No (visible)"} | ${r.corgiClipped ? "YES (clipped)" : "No"} | ${r.pass ? "PASS" : "FAIL"} |`
  );
}

const allPassed = results.every((r) => r.pass);
if (allPassed) {
  console.log("\n✔ SUCCESS: All desktop and tablet viewports meet clearance, bounding, and overlap requirements!");
} else {
  console.log("\n❌ FAIL: Some viewports failed clearance requirements!");
  process.exit(1);
}

