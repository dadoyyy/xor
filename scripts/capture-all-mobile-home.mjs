import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
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

const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function cdpRequest(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = Math.floor(Math.random() * 100000);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id, method, params }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.onerror = (err) => reject(err);
  });
}

async function waitForHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode);
        });
        req.on("error", (err) => reject(err));
        req.setTimeout(2000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  console.log("1. Checking connection to Next.js dev server on port 3000...");
  const serverReady = await waitForHttp("http://127.0.0.1:3000", 5000);
  if (!serverReady) {
    console.error("Next.js dev server is not responding on http://127.0.0.1:3000");
    process.exit(1);
  }
  console.log("Next.js server is active on http://127.0.0.1:3000");

  // Supabase Auth Session
  console.log("2. Signing in test user (xor_automator)...");
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: loginData, error: loginErr } = await userClient.auth.signInWithPassword({
    email: "xor_automator@example.internal",
    password: "TestPassword123!Secure",
  });
  if (loginErr || !loginData.session) {
    console.error("Login failed:", loginErr?.message);
    process.exit(1);
  }
  const regularSession = loginData.session;

  // Launch Chrome Headless
  console.log("3. Launching Chrome headless...");
  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--hide-scrollbars",
    "--disable-gpu",
    "about:blank",
  ]);

  const chromeReady = await waitForHttp("http://127.0.0.1:9222/json/version", 10000);
  if (!chromeReady) {
    console.error("Chrome debugging port failed to respond");
    chromeProc.kill();
    process.exit(1);
  }

  const pagesRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await pagesRes.json();
  const pageWs = pages[0]?.webSocketDebuggerUrl;
  console.log("CDP WebSocket:", pageWs);

  const { windowId } = await cdpRequest(pageWs, "Browser.getWindowForTarget");

  const projectRef = "suctmauaolyuguusydwn";
  const cookieName = `sb-${projectRef}-auth-token`;

  await cdpRequest(pageWs, "Network.enable");

  async function setSessionCookie(sess) {
    const cookieValue = encodeURIComponent(JSON.stringify(sess));
    await cdpRequest(pageWs, "Network.setCookie", {
      name: cookieName,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
    });
  }

  await setSessionCookie(regularSession);

  const testCases = [
    // 1. Mobile widths with afternoon scene
    { filename: "home_mobile_320x640.png", width: 320, height: 640, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },
    { filename: "home_mobile_360x740.png", width: 360, height: 740, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },
    { filename: "home_mobile_390x844.png", width: 390, height: 844, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },
    { filename: "home_mobile_412x915.png", width: 412, height: 915, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },
    { filename: "home_mobile_430x932.png", width: 430, height: 932, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },
    
    // 2. Small 667px height test (above the fold verification)
    { filename: "home_mobile_390x667_fold.png", width: 390, height: 667, isMobile: true, url: "http://localhost:3000/home?scene=afternoon" },

    // 3. Three Scenes at 390x844
    { filename: "home_mobile_morning_390x844.png", width: 390, height: 844, isMobile: true, url: "http://localhost:3000/home?scene=morning" },
    { filename: "home_mobile_evening_390x844.png", width: 390, height: 844, isMobile: true, url: "http://localhost:3000/home?scene=evening" },

    // 4. Tablet and Desktop regression verification
    { filename: "home_tablet_768x1024.png", width: 768, height: 1024, isMobile: false, url: "http://localhost:3000/home?scene=afternoon" },
    { filename: "home_desktop_1440x900.png", width: 1440, height: 900, isMobile: false, url: "http://localhost:3000/home?scene=afternoon" },
  ];

  for (const tc of testCases) {
    console.log(`\nCapturing ${tc.filename} (${tc.width}x${tc.height}) -> ${tc.url}...`);
    
    await cdpRequest(pageWs, "Browser.setWindowBounds", {
      windowId,
      bounds: { width: tc.width, height: tc.height },
    });

    await cdpRequest(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: tc.width,
      height: tc.height,
      deviceScaleFactor: 1,
      mobile: Boolean(tc.isMobile),
    });

    await cdpRequest(pageWs, "Page.navigate", { url: tc.url });
    // Wait for hydration & image load
    await new Promise((r) => setTimeout(r, 2200));

    // Capture screenshot with exact clipping bounds
    const shot = await cdpRequest(pageWs, "Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: tc.width, height: tc.height, scale: 1 },
    });
    const outPath = path.join(artifactDir, tc.filename);
    fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
    console.log(`Saved screenshot: ${tc.filename} (${Math.round(shot.data.length / 1024)} KB)`);
  }

  // Edge Case: Long username & long subtitle on mobile (390x844)
  console.log("\nCapturing edge case: Long username...");
  await cdpRequest(pageWs, "Browser.setWindowBounds", {
    windowId,
    bounds: { width: 390, height: 844 },
  });
  await cdpRequest(pageWs, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdpRequest(pageWs, "Page.navigate", { url: "http://localhost:3000/home?scene=afternoon" });
  await new Promise((r) => setTimeout(r, 2000));
  await cdpRequest(pageWs, "Runtime.evaluate", {
    expression: `(() => {
      const h1 = document.querySelector('[data-home-hero="true"] h1');
      if (h1) {
        h1.innerHTML = 'Good afternoon, <span class="text-[#6D3BE8]">Alexander_The_Great_Scholar</span>!';
      }
      const sub = document.querySelector('[data-home-hero="true"] p');
      if (sub) {
        sub.innerText = 'Keep your 99-day study streak going with a comprehensive review of all subject materials today.';
      }
    })()`,
  });
  await new Promise((r) => setTimeout(r, 500));
  const longUserShot = await cdpRequest(pageWs, "Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 390, height: 844, scale: 1 },
  });
  fs.writeFileSync(path.join(artifactDir, "home_mobile_long_username_390x844.png"), Buffer.from(longUserShot.data, "base64"));
  console.log("Saved screenshot: home_mobile_long_username_390x844.png");

  chromeProc.kill();
  console.log("\nAll captures complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
