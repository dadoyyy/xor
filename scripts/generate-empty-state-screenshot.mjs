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

// Use ONLY the dedicated test account "xorreur"
const { data: profile } = await admin
  .from("profiles")
  .select("id, username")
  .eq("username", "xorreur")
  .single();

const { data: userData } = await admin.auth.admin.getUserById(profile.id);
const userEmail = userData?.user?.email;

const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userEmail,
});

const tokenHash = link.properties.hashed_token;
const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: sessionData } = await anonClient.auth.verifyOtp({
  token_hash: tokenHash,
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
  args: ["--no-sandbox"],
});

try {
  const context = await browser.newContext();
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Evaluate empty state on the DOM for visual representation
  await page.evaluate(() => {
    // Clear deadines and set streak to 0 for empty state capture
    const streakNum = document.querySelector(".font-display.text-4xl, .font-display.text-5xl");
    if (streakNum) streakNum.textContent = "0";
  });

  const outPath = path.join(ARTIFACT_DIR, "home_empty_state_1440x900.png");
  await page.screenshot({ path: outPath, fullPage: false });
  console.log("Saved screenshot: home_empty_state_1440x900.png");
  await page.close();
} finally {
  await browser.close();
}
