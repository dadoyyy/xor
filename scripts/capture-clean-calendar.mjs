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

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies(playwrightCookies);
const page = await context.newPage();

await page.goto("http://localhost:3000/calendar", { waitUntil: "domcontentloaded" });
await page.waitForSelector("main[data-sheet='true']", { state: "visible" });

// Check whether any progress element exists in the DOM
const progressCount = await page.evaluate(() => {
  return document.querySelectorAll("[aria-hidden='true'].fixed.top-0, .h-full.bg-gradient-to-r").length;
});
console.log("Progress DOM elements count:", progressCount);

const screenshotPath = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db/clean_calendar_verified.png";
await page.screenshot({ path: screenshotPath });
console.log("Captured clean calendar screenshot to:", screenshotPath);

await browser.close();
process.exit(0);

