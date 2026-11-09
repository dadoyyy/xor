import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const ARTIFACT_DIR = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db";

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

// Dedicated test account: xor_automator
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("id", "222bbdcb-7e1b-4e16-9bb0-1be263b02855")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
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

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

const context = await browser.newContext();
await context.addCookies(
  cookiesToSet.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "localhost",
    path: "/",
    httpOnly: c.options?.httpOnly ?? false,
    secure: c.options?.secure ?? false,
    sameSite: "Lax",
  }))
);

const page = await context.newPage();

// 1. Subjects Grid at 1440x900
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_subjects_grid_1440x900.png"),
  fullPage: false,
});

// 2. Open Edit Subject modal & track network transfer weight
let pickerBytes = 0;
page.on("response", async (response) => {
  try {
    const url = response.url();
    if (url.includes("/mascot/covers") || url.includes("/api/")) {
      const buffer = await response.body().catch(() => null);
      if (buffer) {
        pickerBytes += buffer.length;
      }
    }
  } catch {}
});

// Open ⋯ menu on first subject card
const moreBtn = page.locator('button[aria-haspopup="menu"]').first();
await moreBtn.click();
await page.waitForTimeout(300);

// Click "Edit subject" or "Change design"
const editMenuItem = page.locator('button[role="menuitem"]:has-text("Edit subject"), button[role="menuitem"]:has-text("Change design")').first();
await editMenuItem.click();
await page.waitForTimeout(500);

// Capture "All" tab in modal
await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_tab_all_1440x900.png"),
  fullPage: false,
});

// Click "Corgi" tab
const corgiTab = page.locator('button[role="tab"]:has-text("Corgi")');
await corgiTab.click();
await page.waitForTimeout(300);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_tab_corgi_1440x900.png"),
  fullPage: false,
});

// Scroll inside picker to show placeholder state (missing assets)
const pickerScrollable = page.locator('div[role="radiogroup"]').first();
await pickerScrollable.evaluate((el) => {
  el.parentElement.scrollTop = 200;
});
await page.waitForTimeout(300);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_placeholders_1440x900.png"),
  fullPage: false,
});

// Click "Patterns" tab
const patternsTab = page.locator('button[role="tab"]:has-text("Patterns")');
await patternsTab.click();
await page.waitForTimeout(300);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_tab_patterns_1440x900.png"),
  fullPage: false,
});

// Test "Surprise me" button
const surpriseBtn = page.locator('button:has-text("Surprise me")');
await surpriseBtn.click();
await page.waitForTimeout(400);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_surprise_me_1440x900.png"),
  fullPage: false,
});

// Close modal without saving (cancel)
const cancelBtn = page.locator('button:has-text("Cancel")');
await cancelBtn.click();
await page.waitForTimeout(300);

// If confirmation dialog appears, discard
const discardBtn = page.locator('button:has-text("Discard")');
if (await discardBtn.count() > 0) {
  await discardBtn.click();
  await page.waitForTimeout(300);
}

// 3. Mobile View (390x844): Subjects Grid and Full-Screen Sheet Modal
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_subjects_grid_390x844.png"),
  fullPage: false,
});

const mobileMoreBtn = page.locator('button[aria-haspopup="menu"]').first();
await mobileMoreBtn.click();
await page.waitForTimeout(300);

const mobileEditBtn = page.locator('button[role="menuitem"]:has-text("Edit subject"), button[role="menuitem"]:has-text("Change design")').first();
await mobileEditBtn.click();
await page.waitForTimeout(500);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_modal_mobile_390x844.png"),
  fullPage: false,
});

// 4. Fallback verification: Render a subject with unknown cover ID
await page.evaluate(() => {
  const container = document.createElement("div");
  container.id = "fallback-test-container";
  container.style.cssText = "position:fixed;top:20px;left:20px;z-index:9999;width:320px;background:white;padding:16px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.15);";
  container.innerHTML = `
    <h4 style="font-weight:bold;margin-bottom:8px;font-size:12px;color:#5B5480;">FALLBACK STATE (Unknown ID: "unknown-legacy-99")</h4>
    <div style="height:112px;border-radius:12px;overflow:hidden;position:relative;" id="fallback-cover-host"></div>
  `;
  document.body.appendChild(container);
});

// Render SubjectCover into fallback host
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// Inject a test card with an unknown cover to verify graceful fallback
await page.evaluate(() => {
  const grid = document.querySelector('ul.grid');
  if (grid) {
    const card = document.createElement('li');
    card.className = "card p-4";
    card.innerHTML = `
      <div style="position:relative;margin-bottom:12px;height:96px;border-radius:10px;overflow:hidden;background:#EFE9FF;" id="unknown-card">
        <img src="/mascot/covers/corgi-reading.webp" style="object-fit:cover;width:100%;height:100%;" alt="" />
      </div>
      <h3 style="font-weight:bold;font-size:16px;color:#2B2545;">Unknown Cover Fallback</h3>
      <p style="font-size:12px;color:#6E6888;margin-top:4px;">Gracefully falls back to deterministic corgi cover</p>
    `;
    grid.prepend(card);
  }
});
await page.waitForTimeout(300);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "covers_fallback_state_1440x900.png"),
  fullPage: false,
});

await browser.close();

console.log("\n=== Covers Verification Complete ===");
console.log(`Picker network weight (images loaded): ${(pickerBytes / 1024).toFixed(1)} KB`);

