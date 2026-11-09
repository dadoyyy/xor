import fs from "fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Dedicated test user
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
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
const TEST_SUBJECT_ID = "f42031ab-0937-4e8a-bddd-7a69233f0248";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies(playwrightCookies);
const page = await context.newPage();

// Track long tasks
await page.addInitScript(() => {
  window.__longTasks = [];
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push({
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
        });
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {}
});

console.log("Navigating to /home on production build ...");
await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
await page.waitForSelector("aside", { state: "visible" });

async function measureNavigation({
  name,
  clickSelector,
  activeCheckSelector,
  contentSelector,
}) {
  // First visit
  const firstVisit = await measureSingleStep({
    name: `${name} (1st visit)`,
    clickSelector,
    activeCheckSelector,
    contentSelector,
  });

  return firstVisit;
}

async function measureSingleStep({
  name,
  clickSelector,
  activeCheckSelector,
  contentSelector,
}) {
  // Reset long tasks
  await page.evaluate(() => { window.__longTasks = []; });

  const clickTarget = page.locator(clickSelector).first();
  await clickTarget.waitFor({ state: "visible" });

  const startTime = Date.now();
  await page.evaluate(() => performance.mark("bench-click"));

  // Click
  await clickTarget.click();

  // (a) Click to active indicator change
  let activeIndicatorTime = null;
  const pollActiveStart = Date.now();
  while (Date.now() - pollActiveStart < 4000) {
    const isActive = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      // Check if active styling is applied
      return el.classList.contains("border-white") ||
             el.classList.contains("text-white") ||
             el.getAttribute("aria-current") === "page" ||
             el.querySelector(".bg-white") !== null;
    }, activeCheckSelector);
    if (isActive) {
      activeIndicatorTime = Date.now() - startTime;
      break;
    }
    await page.waitForTimeout(5);
  }

  // (b) Click to visual change / skeleton
  // (c) Click to real content visible
  await page.locator(contentSelector).first().waitFor({ state: "visible" });
  const contentTime = Date.now() - startTime;

  const longTasks = await page.evaluate(() => window.__longTasks || []);
  const totalLongTaskDuration = longTasks.reduce((sum, t) => sum + t.duration, 0);

  return {
    name,
    indicatorMs: activeIndicatorTime ?? "timeout",
    visualChangeMs: Math.min(activeIndicatorTime ?? contentTime, contentTime),
    contentMs: contentTime,
    longTasksCount: longTasks.length,
    longTaskTotalMs: totalLongTaskDuration,
  };
}

console.log("\n--- MEASURING MAIN NAV ITEMS ---");
const navItems = [
  {
    name: "Nav: /subjects",
    clickSelector: 'aside nav a[href="/subjects"]',
    activeCheckSelector: 'aside nav a[href="/subjects"][aria-current="page"]',
    contentSelector: 'h1:has-text("Subjects")',
  },
  {
    name: "Nav: /calendar",
    clickSelector: 'aside nav a[href="/calendar"]',
    activeCheckSelector: 'aside nav a[href="/calendar"][aria-current="page"]',
    contentSelector: 'main:has-text("Academic Calendar")',
  },
  {
    name: "Nav: /progress",
    clickSelector: 'aside nav a[href="/progress"]',
    activeCheckSelector: 'aside nav a[href="/progress"][aria-current="page"]',
    contentSelector: 'main:has-text("Progress")',
  },
  {
    name: "Nav: /home",
    clickSelector: 'aside nav a[href="/home"]',
    activeCheckSelector: 'aside nav a[href="/home"][aria-current="page"]',
    contentSelector: 'main:has-text("Good"), main:has-text("Activity")',
  },
];

const mainNavResults = [];
for (const item of navItems) {
  const r1 = await measureSingleStep({ ...item, name: `${item.name} [1st visit]` });
  // Second visit: navigate away then back
  const other = item.name.includes("home") ? navItems[0] : navItems[3];
  await measureSingleStep({ ...other, name: "temp" });
  const r2 = await measureSingleStep({ ...item, name: `${item.name} [2nd visit]` });
  mainNavResults.push({
    item: item.name.replace("Nav: ", ""),
    firstIndicator: r1.indicatorMs,
    firstContent: r1.contentMs,
    secondIndicator: r2.indicatorMs,
    secondContent: r2.contentMs,
    longTasks1: r1.longTaskTotalMs,
    longTasks2: r2.longTaskTotalMs,
  });
}

console.log("\n--- MEASURING SUBJECT TABS ---");
await page.goto(`${BASE_URL}/subjects/${TEST_SUBJECT_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector("header nav a", { state: "visible" });

const subjectTabs = [
  {
    name: "Tab: FLASHCARDS",
    clickSelector: `header nav a[href$="/flashcards"]`,
    activeCheckSelector: `header nav a[href$="/flashcards"].border-white`,
    contentSelector: 'h2:has-text("Flashcard decks")',
  },
  {
    name: "Tab: QUIZZES",
    clickSelector: `header nav a[href$="/quizzes"]`,
    activeCheckSelector: `header nav a[href$="/quizzes"].border-white`,
    contentSelector: 'h2:has-text("Quizzes"), main:has-text("Quizzes")',
  },
  {
    name: "Tab: LEADERBOARD",
    clickSelector: `header nav a[href$="/leaderboard"]`,
    activeCheckSelector: `header nav a[href$="/leaderboard"].border-white`,
    contentSelector: 'h2:has-text("Subject leaderboard")',
  },
  {
    name: "Tab: MEMBERS & INVITES",
    clickSelector: `header nav a[href$="/sharing"]`,
    activeCheckSelector: `header nav a[href$="/sharing"].border-white`,
    contentSelector: 'main:has-text("Share subject"), main:has-text("Members")',
  },
  {
    name: "Tab: MATERIALS",
    clickSelector: `header nav a[href$="${TEST_SUBJECT_ID}"]`,
    activeCheckSelector: `header nav a[href$="${TEST_SUBJECT_ID}"].border-white`,
    contentSelector: 'main:has-text("Materials"), main:has-text("Upload")',
  },
];

const subjectTabResults = [];
for (const tab of subjectTabs) {
  const r1 = await measureSingleStep({ ...tab, name: `${tab.name} [1st visit]` });
  // Second visit: click another tab then click back
  const otherTab = tab.name.includes("MATERIALS") ? subjectTabs[0] : subjectTabs[4];
  await measureSingleStep({ ...otherTab, name: "temp-tab" });
  const r2 = await measureSingleStep({ ...tab, name: `${tab.name} [2nd visit]` });
  subjectTabResults.push({
    tab: tab.name.replace("Tab: ", ""),
    firstIndicator: r1.indicatorMs,
    firstContent: r1.contentMs,
    secondIndicator: r2.indicatorMs,
    secondContent: r2.contentMs,
    longTasks1: r1.longTaskTotalMs,
    longTasks2: r2.longTaskTotalMs,
  });
}

console.log("\n=================== BASELINE RESULTS ===================");
console.log("\nMAIN NAVIGATION ITEMS:");
console.table(mainNavResults);
console.log("\nSUBJECT WORKSPACE TABS:");
console.table(subjectTabResults);

fs.writeFileSync("scripts/baseline_measurements.json", JSON.stringify({
  mainNav: mainNavResults,
  subjectTabs: subjectTabResults,
}, null, 2));

await browser.close();
process.exit(0);
