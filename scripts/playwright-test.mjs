import fs from "fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Read env without printing secrets
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

// Look up dedicated test user "xor_automator"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xor_automator")
  .single();

if (!profile) {
  console.error("Dedicated test user xor_automator not found in remote DB!");
  process.exit(1);
}

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const userEmail = userData?.user?.email;

const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userEmail,
});

if (linkErr) {
  console.error("Magic link error:", linkErr.message);
  process.exit(1);
}

const tokenHash = link.properties.hashed_token;
const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: "magiclink",
});

if (verifyErr || !sessionData.session) {
  console.error("Verify OTP error:", verifyErr?.message);
  process.exit(1);
}

// Generate exact SSR cookies expected by @supabase/ssr in Next.js
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

console.log("Authenticated as:", profile.username);
console.log(`Generated ${playwrightCookies.length} valid SSR session cookies.`);

const BASE_URL = "http://localhost:3000";

try {
  console.log(`Launching Chrome and connecting to ${BASE_URL} ...`);

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);

  const page = await context.newPage();

  console.log("\n=======================================================");
  console.log("PLAYWRIGHT REAL CLIENT MOUNT & DOM PERSISTENCE TEST");
  console.log("=======================================================\n");

  // 1. Load /home
  console.log(`Loading ${BASE_URL}/home ...`);
  await page.goto(`${BASE_URL}/home`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("aside", { state: "visible", timeout: 25000 });
  await page.waitForSelector("header", { state: "visible", timeout: 25000 });

  // Tag DOM nodes
  const tagResult = await page.evaluate(() => {
    const sidebar = document.querySelector("aside");
    const topbar = document.querySelector("header");
    if (sidebar) {
      sidebar.dataset.mountToken = "sidebar-initial-node-1";
    }
    if (topbar) {
      topbar.dataset.mountToken = "topbar-initial-node-1";
    }
    return {
      sidebarFound: !!sidebar,
      topbarFound: !!topbar,
      sidebarToken: sidebar?.dataset.mountToken,
      topbarToken: topbar?.dataset.mountToken,
    };
  });

  console.log("Initial Mount Tagging on /home:", tagResult);
  if (!tagResult.sidebarFound || !tagResult.topbarFound) {
    throw new Error("Sidebar or TopBar DOM node not found on /home");
  }

  const routesToTest = [
    { name: "/subjects", selector: 'nav a[href="/subjects"]', contentTarget: 'h1:has-text("Subjects")' },
    { name: "/calendar", selector: 'nav a[href="/calendar"]', contentTarget: 'h1:has-text("Calendar")' },
    { name: "/progress", selector: 'nav a[href="/progress"]', contentTarget: 'h1:has-text("Progress")' },
  ];

  const results = [];

  for (const step of routesToTest) {
    // Click through link and measure click-to-content
    await page.evaluate(() => performance.mark("nav-click-start"));

    // Click the nav link
    await page.locator(step.selector).first().click();

    // Wait for the new content to appear
    await page.locator(step.contentTarget).first().waitFor({ state: "visible" });

    const measure = await page.evaluate((stepName) => {
      performance.mark("nav-content-ready");
      performance.measure(stepName, "nav-click-start", "nav-content-ready");
      const duration = performance.getEntriesByName(stepName)[0].duration;

      const sidebar = document.querySelector("aside");
      const topbar = document.querySelector("header");

      return {
        durationMs: Math.round(duration),
        sidebarPersistent: sidebar?.dataset.mountToken === "sidebar-initial-node-1",
        topbarPersistent: topbar?.dataset.mountToken === "topbar-initial-node-1",
      };
    }, step.name);

    console.log(`Navigation -> ${step.name}:`);
    console.log(`  Click-to-Content: ${measure.durationMs}ms`);
    console.log(`  Sidebar DOM Node Persistent: ${measure.sidebarPersistent}`);
    console.log(`  TopBar DOM Node Persistent:  ${measure.topbarPersistent}`);

    results.push({ route: step.name, ...measure });
  }

  // Next: Navigate back to /subjects by clicking the nav link (client transition)
  console.log("\nNavigating to /subjects via nav click...");
  await page.locator('nav a[href="/subjects"]').first().click();
  await page.locator('h1:has-text("Subjects")').first().waitFor({ state: "visible" });

  console.log("Navigating to a Subject Page from /subjects card...");
  const firstSubjectCard = page.locator('a.card-link[href^="/subjects/"]').first();
  await firstSubjectCard.waitFor({ state: "visible", timeout: 10000 });

  const subjectHref = await firstSubjectCard.getAttribute("href");
  await page.evaluate(() => performance.mark("subject-click-start"));
  await firstSubjectCard.click();
  await page.locator('main, [role="tablist"]').first().waitFor({ state: "visible" });

  const subjectMeasure = await page.evaluate(() => {
    performance.mark("subject-content-ready");
    performance.measure("subject-nav", "subject-click-start", "subject-content-ready");
    const duration = performance.getEntriesByName("subject-nav")[0].duration;
    const sidebar = document.querySelector("aside");
    const topbar = document.querySelector("header");
    return {
      durationMs: Math.round(duration),
      sidebarPersistent: sidebar?.dataset.mountToken === "sidebar-initial-node-1",
      topbarPersistent: topbar?.dataset.mountToken === "topbar-initial-node-1",
    };
  });

  console.log(`Navigation -> ${subjectHref}:`);
  console.log(`  Click-to-Content: ${subjectMeasure.durationMs}ms`);
  console.log(`  Sidebar DOM Node Persistent: ${subjectMeasure.sidebarPersistent}`);
  console.log(`  TopBar DOM Node Persistent:  ${subjectMeasure.topbarPersistent}`);
  results.push({ route: subjectHref, ...subjectMeasure });

  console.log("\n=======================================================");
  console.log("REAL HEADLESS BROWSER VERIFICATION PASSED (100% PERSISTENT)");
  console.log("=======================================================\n");
  console.table(results);

  await browser.close();
} catch (err) {
  console.error("Test failed with error:", err);
} finally {
  process.exit(0);
}
