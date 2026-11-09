import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ARTIFACT_DIR = "C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

// 1. Desktop 1440x900
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await desktopContext.newPage();

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "auth_login_desktop_1440x900.png"),
  fullPage: false,
});

// Closeup of login card
const loginCard = page.locator(".card");
if (await loginCard.count() > 0) {
  await loginCard.screenshot({
    path: path.join(ARTIFACT_DIR, "auth_login_card_closeup.png"),
  });
}

// 2. Signup Tab
const signupTab = page.locator('button[role="tab"]:has-text("Create account")');
if (await signupTab.count() > 0) {
  await signupTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "auth_signup_desktop_1440x900.png"),
    fullPage: false,
  });
}

// 3. Mobile 390x844
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await mobilePage.waitForTimeout(600);
await mobilePage.screenshot({
  path: path.join(ARTIFACT_DIR, "auth_login_mobile_390x844.png"),
  fullPage: false,
});

await browser.close();
console.log("Auth screenshots captured successfully!");

