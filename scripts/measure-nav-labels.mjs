import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const page = await browser.newPage();
await page.goto("http://localhost:3000/home", { waitUntil: "networkidle" });

const widths = await page.evaluate(() => {
  const labels = ["Home", "Subjects", "Calendar", "Progress"];
  const res = {};
  for (const l of labels) {
    const el = document.createElement("span");
    el.style.fontFamily = "var(--font-display, inherit)";
    el.style.fontSize = "11px";
    el.style.fontWeight = "700";
    el.style.letterSpacing = "normal";
    el.style.whiteSpace = "nowrap";
    el.innerText = l;
    document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    res[l] = { width: rect.width, clearanceInside60: (60 - rect.width) / 2, clearanceInside64: (64 - rect.width) / 2 };
    el.remove();
  }
  return res;
});

console.log("Label Widths and Clearances:", JSON.stringify(widths, null, 2));
await browser.close();

