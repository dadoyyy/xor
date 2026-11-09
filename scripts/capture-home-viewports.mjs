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
    } catch (err) {
      console.log(`[wait error on ${url}]: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  console.log("1. Starting Next.js production server on port 3001...");
  const nextServer = spawn("cmd.exe", ["/c", "npx", "next", "start", "apps/web", "-H", "127.0.0.1", "-p", "3001"], {
    stdio: "pipe",
    env: { ...process.env, ...env, PORT: "3001" },
  });

  nextServer.stdout.on("data", (d) => process.stdout.write("[Next] " + d));
  nextServer.stderr.on("data", (d) => process.stderr.write("[Next err] " + d));

  const serverReady = await waitForHttp("http://127.0.0.1:3001", 25000);
  if (!serverReady) {
    console.error("Next.js server failed to respond on port 3001");
    nextServer.kill();
    process.exit(1);
  }
  console.log("Next.js server is ready on http://127.0.0.1:3001");

  // Supabase Auth Session for real user
  console.log("2. Generating session for real user...");
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  
  // Real user session
  const realEmail = "markantoncamoro@gmail.com";
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: realEmail,
  });
  const token = linkData.properties.hashed_token;
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionData } = await userClient.auth.verifyOtp({
    token_hash: token,
    type: "magiclink",
  });
  const realSession = sessionData.session;

  // New user session with zero data
  console.log("3. Generating brand-new test user for empty state...");
  const testEmail = `test_empty_${Date.now()}@xor.internal`;
  const { data: newUserData } = await admin.auth.admin.createUser({
    email: testEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { username: "new_corgi" },
  });
  const testUserId = newUserData.user?.id;
  await admin.from("profiles").upsert({
    id: testUserId,
    username: "new_corgi",
    timezone: "UTC",
    current_streak: 0,
    longest_streak: 0,
  });
  const { data: testLogin } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: "Password123!",
  });
  const emptySession = testLogin.session;

  // Launch Chrome Headless
  console.log("4. Launching Chrome headless...");
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
    nextServer.kill();
    process.exit(1);
  }

  const pagesRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await pagesRes.json();
  const pageWs = pages[0]?.webSocketDebuggerUrl;
  console.log("CDP WebSocket:", pageWs);

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

  const viewports = [
    { name: "home_1366x768.png", width: 1366, height: 768, isDesktop: true, session: realSession, label: "1366x768 Desktop" },
    { name: "home_1440x900.png", width: 1440, height: 900, isDesktop: true, session: realSession, label: "1440x900 Desktop" },
    { name: "home_1920x1080.png", width: 1920, height: 1080, isDesktop: true, session: realSession, label: "1920x1080 Desktop" },
    { name: "home_phone_390x844.png", width: 390, height: 844, isDesktop: false, isMobile: true, session: realSession, label: "390x844 Phone" },
    { name: "home_empty_state.png", width: 1440, height: 900, isDesktop: true, session: emptySession, label: "Brand New User Empty State (1440x900)" },
  ];

  console.log("\n--- Capturing Viewports ---");
  for (const vp of viewports) {
    console.log(`\nConfiguring ${vp.label} (${vp.width}x${vp.height})...`);
    await setSessionCookie(vp.session);

    await cdpRequest(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: Boolean(vp.isMobile),
    });

    await cdpRequest(pageWs, "Page.navigate", { url: "http://localhost:3001/home" });
    // Allow React 19 / Next 16 hydration
    await new Promise((r) => setTimeout(r, 2200));

    // Measure page scroll
    const scrollEval = await cdpRequest(pageWs, "Runtime.evaluate", {
      expression: `({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyScrollHeight: document.body.scrollHeight,
        hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
      })`,
      returnByValue: true,
    });

    const metrics = scrollEval.result.value;
    console.log(`Scroll Metrics for ${vp.label}:`, metrics);
    if (vp.isDesktop) {
      const noScroll = metrics.scrollHeight <= metrics.clientHeight;
      console.log(`=> Desktop No-Scroll Check: ${noScroll ? "PASS (No scrollbar)" : "FAIL (Has scrollbar)"}`);
    }

    const shot = await cdpRequest(pageWs, "Page.captureScreenshot", { format: "png" });
    const outPath = path.join(artifactDir, vp.name);
    fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
    console.log(`Saved screenshot: ${outPath} (${Math.round(shot.data.length / 1024)} KB)`);
  }

  // Cleanup test user
  if (testUserId) {
    console.log("\nCleaning up temporary test user...");
    await admin.auth.admin.deleteUser(testUserId);
  }

  chromeProc.kill();
  nextServer.kill();
  console.log("\nAll viewport tests and screenshots completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error in capture script:", err);
  process.exit(1);
});
