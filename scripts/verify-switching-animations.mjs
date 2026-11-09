import fs from "fs";
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

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const sidebar = page.locator('aside[data-sidebar="true"]');
const indicator = page.locator('[data-indicator="desktop"]');

// Frame 1: On Home
await sidebar.screenshot({ path: `${ARTIFACT_DIR}/nav_anim_step1_home.png` });

// Click Subjects and capture mid-flight and destination
const subjectsLink = page.locator('a[href="/subjects"]').first();
await subjectsLink.click();
await page.waitForTimeout(100); // mid-flight
await sidebar.screenshot({ path: `${ARTIFACT_DIR}/nav_anim_step2_midflight.png` });

await page.waitForTimeout(300); // landing
await sidebar.screenshot({ path: `${ARTIFACT_DIR}/nav_anim_step3_subjects.png` });

// Click Progress and capture landing
const progressLink = page.locator('a[href="/progress"]').first();
await progressLink.click();
await page.waitForTimeout(350);
await sidebar.screenshot({ path: `${ARTIFACT_DIR}/nav_anim_step4_progress.png` });

console.log("Animation verification screenshots captured successfully!");
await browser.close();
