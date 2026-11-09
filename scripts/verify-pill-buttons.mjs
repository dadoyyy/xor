import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// --- 1. Contrast Math ---
function hexToLuminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16) / 255);
  const a = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Number(ratio.toFixed(2));
}

console.log("=== BUTTON CONTRAST VERIFICATION ===");
const buttonVariants = [
  { variant: "Primary (.btn-primary)", fg: "#FFFFFF", bg: "#7C3AED", required: ">= 4.5:1" },
  { variant: "Primary Hover", fg: "#FFFFFF", bg: "#6D28D9", required: ">= 4.5:1" },
  { variant: "Secondary (.btn-secondary)", fg: "#2B1B5A", bg: "#FFFFFF", required: ">= 4.5:1" },
  { variant: "Accent / Sun (.btn-accent / .btn-sun)", fg: "#2B1B5A", bg: "#FFCC33", required: ">= 4.5:1" },
  { variant: "Accent Hover", fg: "#2B1B5A", bg: "#F5BE18", required: ">= 4.5:1" },
  { variant: "Deadlines Accent (.btn-cream-accent)", fg: "#2B1B5A", bg: "#F6C531", required: ">= 4.5:1" },
  { variant: "Danger / Coral (.btn-danger)", fg: "#FFFFFF", bg: "#DC2626", required: ">= 4.5:1" },
  { variant: "Ghost (.btn-ghost)", fg: "#2B1B5A", bg: "#FFFFFF", required: ">= 4.5:1" },
  { variant: "Disabled Muted Text", fg: "#655887", bg: "#EDE8F5", required: ">= 4.5:1" },
];

const contrastTable = buttonVariants.map((b) => {
  const ratio = contrastRatio(b.fg, b.bg);
  return {
    Variant: b.variant,
    Foreground: b.fg,
    Background: b.bg,
    "Measured Ratio": `${ratio} : 1`,
    Target: b.required,
    Status: ratio >= 4.5 ? "PASS" : "FAIL",
  };
});
console.table(contrastTable);

// --- 2. Auth setup with xor_automator ---
const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = v;
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

if (!profile) throw new Error("xor_automator not found");

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

const playwrightCookies = cookiesToSet.map((c) => ({
  name: c.name,
  value: c.value,
  domain: "localhost",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));

const artifactDir = path.resolve("C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db");
const subjectId = "f42031ab-0937-4e8a-bddd-7a69233f0248";
const quizId = "8e47d67d-05f7-4a30-ac51-e0500a3184c2";
const deckId = "9c5b38d2-7656-4462-a9e1-4621568cc088";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

async function createAuthedContext(viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies(playwrightCookies);
  const page = await ctx.newPage();
  return { ctx, page };
}

console.log("\n=== 1. VERIFYING ZERO SHEET SCROLL ON /home ===");
const zeroScrollResults = [];
for (const vp of [{ w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1366, h: 768 }]) {
  const { ctx, page } = await createAuthedContext({ width: vp.w, height: vp.h });
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const scrollInfo = await page.evaluate(() => {
    const sheet = document.querySelector('[data-sheet="true"]');
    return {
      scrollHeight: sheet ? sheet.scrollHeight : 0,
      clientHeight: sheet ? sheet.clientHeight : 0,
      overflows: sheet ? sheet.scrollHeight > sheet.clientHeight : false,
    };
  });

  zeroScrollResults.push({
    Viewport: `${vp.w}x${vp.h}`,
    "Client Height": `${scrollInfo.clientHeight}px`,
    "Scroll Height": `${scrollInfo.scrollHeight}px`,
    "Sheet Overflow": scrollInfo.overflows ? "OVERFLOW" : "0px (Fits Viewport)",
  });
  await ctx.close();
}
console.table(zeroScrollResults);

console.log("\n=== 2. CAPTURING VERIFICATION SCREENSHOTS ===");
const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

for (const vp of viewports) {
  const { ctx, page } = await createAuthedContext({ width: vp.width, height: vp.height });

  // A. /home
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_home_${vp.name}.png`) });
  console.log(`Saved pill_home_${vp.name}.png`);

  // B. /subjects
  await page.goto("http://localhost:3000/subjects", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_subjects_${vp.name}.png`) });
  console.log(`Saved pill_subjects_${vp.name}.png`);

  // C. Subject page (materials & invite friends)
  await page.goto(`http://localhost:3000/subjects/${subjectId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_subject_workspace_${vp.name}.png`) });
  console.log(`Saved pill_subject_workspace_${vp.name}.png`);

  // D. Subject Quiz screen
  await page.goto(`http://localhost:3000/subjects/${subjectId}/quizzes/${quizId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_quiz_screen_${vp.name}.png`) });
  console.log(`Saved pill_quiz_screen_${vp.name}.png`);

  // E. Subject Flashcards screen
  await page.goto(`http://localhost:3000/subjects/${subjectId}/flashcards/${deckId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_flashcard_screen_${vp.name}.png`) });
  console.log(`Saved pill_flashcard_screen_${vp.name}.png`);

  // F. /calendar (with view switcher pills)
  await page.goto("http://localhost:3000/calendar", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_calendar_${vp.name}.png`) });
  console.log(`Saved pill_calendar_${vp.name}.png`);

  // G. Calendar Add Event Modal
  const addEventBtn = page.locator("button:has-text('Add Event')");
  if (await addEventBtn.isVisible()) {
    await addEventBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, `pill_modal_add_event_${vp.name}.png`) });
    console.log(`Saved pill_modal_add_event_${vp.name}.png`);
  }

  // H. /progress (with heatmap switcher pills)
  await page.goto("http://localhost:3000/progress", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, `pill_progress_${vp.name}.png`) });
  console.log(`Saved pill_progress_${vp.name}.png`);

  await ctx.close();
}

// Keyboard Navigation & Focus Ring Check
console.log("\n=== 3. VERIFYING KEYBOARD NAVIGATION & FOCUS RING ===");
const { ctx: kCtx, page: kPage } = await createAuthedContext({ width: 1440, height: 900 });
await kPage.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
await kPage.waitForTimeout(600);

// Tab to focus the first quick action button
for (let i = 0; i < 4; i++) {
  await kPage.keyboard.press("Tab");
  await kPage.waitForTimeout(100);
}

const focusPillCheck = await kPage.evaluate(() => {
  const el = document.activeElement;
  if (!el) return null;
  const style = window.getComputedStyle(el);
  return {
    tag: el.tagName,
    text: el.textContent?.trim(),
    className: el.className,
    borderRadius: style.borderRadius,
    outline: style.outline,
    outlineOffset: style.outlineOffset,
  };
});
console.log("Focused element computed style:", focusPillCheck);
await kPage.screenshot({ path: path.join(artifactDir, "pill_focus_ring_keyboard.png") });
console.log("Saved pill_focus_ring_keyboard.png");
await kCtx.close();

await browser.close();
console.log("\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
