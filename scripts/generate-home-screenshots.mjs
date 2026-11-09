import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Find the latest compiled CSS file in .next/static/chunks
const cssChunks = fs.readdirSync("apps/web/.next/static/chunks").filter((f) => f.endsWith(".css"));
if (cssChunks.length === 0) {
  throw new Error("No CSS chunks found in apps/web/.next/static/chunks");
}
const cssPath = path.resolve(`apps/web/.next/static/chunks/${cssChunks[0]}`);
const cssContent = fs.readFileSync(cssPath, "utf8");

const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const publicDir = path.resolve("apps/web/public").replace(/\\/g, "/");

function getImgSrc(rel) {
  return `file:///${publicDir}${rel}`;
}

// Generate ~20-week heatmap cells (140 days)
function generateHeatmapHtml(isEmpty = false) {
  let cells = "";
  for (let i = 0; i < 140; i++) {
    let level = 0;
    if (!isEmpty) {
      if (i > 100 && i % 3 === 0) level = 1;
      if (i > 115 && i % 4 === 0) level = 2;
      if (i >= 134) level = 3;
    }
    const bgClass =
      level === 3
        ? "bg-grape text-white"
        : level === 2
          ? "bg-grape/60"
          : level === 1
            ? "bg-grape-tint"
            : "bg-paper border border-line";
    cells += `<div class="size-2.5 sm:size-3 rounded-[2px] transition-transform ${bgClass}" title="Day ${i}"></div>`;
  }
  return cells;
}

function buildFullHtml({ username, isEmpty, streak, longestStreak, todayQualified }) {
  const heatmapCells = generateHeatmapHtml(isEmpty);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Home — xor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${cssContent}
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body class="bg-sky text-ink h-screen overflow-hidden font-sans">
  <div class="flex h-screen w-full overflow-hidden bg-sky text-ink">
    
    <!-- 1. Full-Height Continuous Left Sidebar -->
    <aside class="hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper/95 lg:flex xl:w-72">
      <div class="flex h-full flex-col justify-between p-4 overflow-y-auto">
        <!-- Brand Header & Nav -->
        <div class="space-y-6">
          <div class="flex items-center gap-3 px-2 pt-1 pb-2">
            <div class="relative size-10 shrink-0">
              <img src="${getImgSrc("/mascot/logo-icon.webp")}" alt="xor logo" style="width:40px;height:40px;" class="object-contain" />
            </div>
            <div class="min-w-0">
              <span class="font-display text-xl font-bold tracking-tight text-ink">xor</span>
              <p class="text-[11px] font-semibold text-ink-soft">Collaborative Study</p>
            </div>
          </div>

          <!-- Nav Links (Pills) -->
          <nav class="space-y-1.5">
            <a href="#" class="flex items-center gap-3.5 rounded-full px-4 py-2.5 font-display text-sm font-bold bg-grape text-white shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Home</span>
            </a>
            <div>
              <div class="flex items-center justify-between rounded-full px-4 py-2.5 font-display text-sm font-bold text-ink hover:bg-lilac transition-colors">
                <div class="flex flex-1 items-center gap-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path></svg>
                  <span>Subjects</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div class="ml-6 mt-1 space-y-1 border-l-2 border-line pl-3">
                <a href="#" class="flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-ink-soft hover:bg-lilac">My subjects</a>
                <a href="#" class="flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-ink-soft hover:bg-lilac">Shared with me</a>
                <button class="flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left font-display text-xs font-bold text-grape hover:bg-grape-tint">+ New subject</button>
              </div>
            </div>
            <a href="#" class="flex items-center gap-3.5 rounded-full px-4 py-2.5 font-display text-sm font-bold text-ink hover:bg-lilac transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
              <span>Calendar</span>
            </a>
            <a href="#" class="flex items-center gap-3.5 rounded-full px-4 py-2.5 font-display text-sm font-bold text-ink hover:bg-lilac transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
              <span>Progress</span>
            </a>
          </nav>
        </div>

        <!-- Bottom Section: Squad Card + User Profile -->
        <div class="space-y-3.5 pt-4">
          <div class="rounded-2xl border border-line bg-sky/50 p-3.5 text-left">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-base">👑</span>
              <span class="font-display text-xs font-bold text-ink">xor Squad</span>
            </div>
            <p class="text-[11px] leading-tight text-ink-soft mb-3">
              Collaborate with peers, share flashcards, and boost your streak together.
            </p>
            <button class="btn btn-primary btn-sm rounded-full w-full text-xs font-bold py-1.5">
              + New Subject
            </button>
          </div>

          <div class="flex items-center justify-between rounded-full border border-line bg-paper px-3 py-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-sun text-xs font-bold text-ink">
                ${username.slice(0, 1).toUpperCase()}
              </span>
              <div class="min-w-0">
                <p class="truncate font-display text-xs font-bold text-ink">${username}</p>
                <p class="truncate text-[10px] text-ink-soft">
                  ${streak > 0 ? `${streak}-day streak 🔥` : "Active student"}
                </p>
              </div>
            </div>
            <button class="rounded-full p-1.5 text-ink-soft hover:bg-lilac">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 2. Right Content Area with TopBar Inside -->
    <div class="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
      <!-- Lingora-style TopBar -->
      <header class="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-line bg-paper/95 px-4 sm:px-6 backdrop-blur-md">
        <div class="flex flex-1 items-center gap-3 max-w-xl">
          <form class="relative w-full max-w-md">
            <svg class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="search"
              placeholder="Search subjects, decks, quizzes..."
              class="w-full rounded-full border border-line bg-sky/50 py-2 pl-9 pr-4 text-xs sm:text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            />
          </form>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div class="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-display text-xs font-bold bg-lilac/50 text-ink">
            <span>🔥</span>
            <span>${streak} ${streak === 1 ? "day" : "days"}</span>
            ${todayQualified ? '<span class="size-1.5 rounded-full bg-mint"></span>' : ''}
          </div>
          <button class="btn btn-sm rounded-full border border-line flex items-center gap-1.5 py-1 px-3">
            <span class="grid size-6 place-items-center rounded-full bg-sun text-xs font-bold text-ink">
              ${username.slice(0, 1).toUpperCase()}
            </span>
            <span class="hidden max-w-[9rem] truncate sm:inline">${username}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </header>

      <!-- Main Page Content -->
      <main class="flex-1 min-h-0 overflow-y-auto">
        <div class="flex flex-col h-full gap-3 sm:gap-4 p-3 sm:p-5 lg:p-6 overflow-y-auto lg:overflow-hidden min-h-0">
          
          <!-- Header Strip -->
          <header class="card p-3.5 sm:p-4.5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-paper">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="relative size-11 sm:size-12 shrink-0">
                <img src="${getImgSrc("/mascot/logo-icon.webp")}" alt="xor study companion" style="width:48px;height:48px;" class="object-contain" />
              </div>
              <div class="min-w-0">
                <h1 class="font-display text-lg sm:text-xl font-bold text-ink truncate">
                  Welcome back, <span class="text-grape">${username}</span>!
                </h1>
                <p class="text-xs sm:text-sm text-ink-soft truncate max-w-xl">
                  Keep your ${streak}-day study streak going with a quick review today.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <button class="btn btn-primary btn-sm flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M12 9v6"></path><path d="M9 12h6"></path></svg>
                <span>New subject</span>
              </button>
              <button class="btn btn-secondary btn-sm flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>
                <span>Join with a key</span>
              </button>
              <button class="btn btn-accent btn-sm flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line><line x1="10" x2="8" y1="9" y2="9"></line></svg>
                <span>Import text</span>
              </button>
            </div>
          </header>

          <!-- Middle Row: 3 Equal Cards -->
          <section class="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 flex-1 min-h-0">
            <!-- Streak Card -->
            <div class="card p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-h-0">
              <div class="flex items-center justify-between border-b border-line pb-3 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-coral text-lg">🔥</span>
                  <h2 class="font-display text-base font-bold text-ink">Study Streak</h2>
                </div>
                <span class="text-xs font-semibold text-ink-soft">Best: ${longestStreak} days</span>
              </div>
              <div class="py-2 flex flex-col justify-center my-auto">
                <div class="flex items-baseline gap-2 mb-3">
                  <span class="font-display text-4xl sm:text-5xl font-extrabold text-ink leading-none">${streak}</span>
                  <span class="font-display text-base font-bold text-coral">days active</span>
                </div>
                <div class="grid grid-cols-7 gap-1.5 pt-2 border-t border-line/60">
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">M</span><div class="size-6 sm:size-7 rounded-full bg-mint text-white text-[10px] font-bold grid place-items-center">✓</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">T</span><div class="size-6 sm:size-7 rounded-full bg-mint text-white text-[10px] font-bold grid place-items-center">✓</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">W</span><div class="size-6 sm:size-7 rounded-full bg-mint text-white text-[10px] font-bold grid place-items-center">✓</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">T</span><div class="size-6 sm:size-7 rounded-full bg-mint text-white text-[10px] font-bold grid place-items-center">✓</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">F</span><div class="size-6 sm:size-7 rounded-full bg-paper border border-line text-ink-soft text-[10px] font-bold grid place-items-center">·</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">S</span><div class="size-6 sm:size-7 rounded-full bg-paper border border-line text-ink-soft text-[10px] font-bold grid place-items-center">·</div></div>
                  <div class="flex flex-col items-center gap-1"><span class="text-[10px] font-bold text-ink-soft">S</span><div class="size-6 sm:size-7 rounded-full bg-paper border border-line text-ink-soft text-[10px] font-bold grid place-items-center">·</div></div>
                </div>
              </div>
            </div>

            <!-- Due Soon Card -->
            <div class="card p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-h-0">
              <div class="flex items-center justify-between border-b border-line pb-3 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-grape text-lg">📅</span>
                  <h2 class="font-display text-base font-bold text-ink">Due soon</h2>
                </div>
                <a href="#" class="text-xs font-semibold text-grape hover:underline">Calendar →</a>
              </div>
              <div class="space-y-2.5 my-auto py-2">
                <div class="flex items-center justify-between p-2 rounded-xl bg-lilac/30 border border-line/60">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="size-2 rounded-full bg-coral shrink-0"></span>
                    <span class="text-xs font-bold text-ink truncate">Physics Chapter 4 Quiz</span>
                  </div>
                  <span class="text-[11px] font-bold text-coral shrink-0">Tomorrow</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-xl bg-lilac/30 border border-line/60">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="size-2 rounded-full bg-sun shrink-0"></span>
                    <span class="text-xs font-bold text-ink truncate">World History Review</span>
                  </div>
                  <span class="text-[11px] font-semibold text-ink-soft shrink-0">In 3 days</span>
                </div>
              </div>
            </div>

            <!-- Continue Studying Card -->
            <div class="card p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-h-0">
              <div class="flex items-center justify-between border-b border-line pb-3 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-sun text-lg">✨</span>
                  <h2 class="font-display text-base font-bold text-ink">Continue studying</h2>
                </div>
                <span class="chip text-[10px]">Quiz</span>
              </div>
              <div class="my-auto py-2">
                <p class="font-display text-sm font-bold text-ink truncate mb-1">Cell Biology & Genetics</p>
                <p class="text-xs text-ink-soft truncate mb-3">Biology 101</p>
                <div class="w-full bg-lilac rounded-full h-2 mb-3">
                  <div class="bg-grape h-2 rounded-full" style="width: 65%;"></div>
                </div>
                <button class="btn btn-primary btn-sm w-full font-bold">Resume Quiz</button>
              </div>
            </div>
          </section>

          <!-- Bottom Row: Heatmap & Recent Subjects -->
          <section class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 shrink-0 lg:h-[200px] xl:h-[220px]">
            <div class="card p-3.5 sm:p-4.5 lg:col-span-7 xl:col-span-8 flex flex-col justify-between overflow-hidden">
              <div class="flex items-center justify-between border-b border-line pb-2.5">
                <h2 class="font-display text-sm font-bold text-ink">Study Activity</h2>
                <span class="text-xs text-ink-soft">Last 20 weeks</span>
              </div>
              <div class="py-2 overflow-x-auto">
                <div class="grid grid-rows-7 grid-flow-col gap-1 w-max">
                  ${heatmapCells}
                </div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-ink-soft border-t border-line/60 pt-2">
                <span>Active study days qualify with &ge;1 quiz or &ge;5 flashcards</span>
                <div class="flex items-center gap-1.5">
                  <span>Less</span>
                  <div class="size-2 rounded-[2px] bg-paper border border-line"></div>
                  <div class="size-2 rounded-[2px] bg-grape-tint"></div>
                  <div class="size-2 rounded-[2px] bg-grape/60"></div>
                  <div class="size-2 rounded-[2px] bg-grape"></div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <div class="card p-3.5 sm:p-4.5 lg:col-span-5 xl:col-span-4 flex flex-col justify-between overflow-hidden">
              <div class="flex items-center justify-between border-b border-line pb-2.5">
                <h2 class="font-display text-sm font-bold text-ink">Recent subjects</h2>
                <a href="#" class="text-xs font-semibold text-grape hover:underline">All →</a>
              </div>
              <div class="space-y-2 py-1">
                <div class="flex items-center justify-between p-2 rounded-xl border border-line bg-paper">
                  <span class="text-xs font-bold text-ink truncate">Biology 101</span>
                  <span class="text-[10px] text-ink-soft">4 members</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-xl border border-line bg-paper">
                  <span class="text-xs font-bold text-ink truncate">Organic Chemistry</span>
                  <span class="text-[10px] text-ink-soft">2 members</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-xl border border-line bg-paper">
                  <span class="text-xs font-bold text-ink truncate">World History</span>
                  <span class="text-[10px] text-ink-soft">1 member</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  </div>
</body>
</html>`;
}

// Generate HTML and run Chrome headless screenshot
const html = buildFullHtml({
  username: "Alex",
  isEmpty: false,
  streak: 4,
  longestStreak: 12,
  todayQualified: true,
});

const tempHtml = path.resolve("temp_preview.html");
fs.writeFileSync(tempHtml, html, "utf8");

const outPng = path.join(artifactDir, "lingora_nav_layout.png");
console.log("Taking screenshot...");
execSync(
  `"${chromePath}" --headless --no-sandbox --disable-gpu --window-size=1440,900 --screenshot="${outPng}" "file:///${tempHtml.replace(/\\/g, "/")}"`,
  { stdio: "inherit" }
);
console.log("Screenshot saved to:", outPng);
