import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Find latest compiled CSS chunk
const chunksDir = "apps/web/.next/static/chunks";
let cssContent = "";
if (fs.existsSync(chunksDir)) {
  const cssChunks = fs.readdirSync(chunksDir).filter((f) => f.endsWith(".css"));
  if (cssChunks.length > 0) {
    cssContent = fs.readFileSync(path.resolve(`${chunksDir}/${cssChunks[0]}`), "utf8");
  }
}

if (!cssContent) {
  // Fallback to globals.css if build in progress
  cssContent = fs.readFileSync("apps/web/src/styles/globals.css", "utf8");
}

const artifactDir = "C:\\Users\\Mark Anton Camoro\\.gemini\\antigravity\\brain\\418ee67f-d099-4d47-9181-c951c63120db";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const publicDir = path.resolve("apps/web/public").replace(/\\/g, "/");

function getImgSrc(rel) {
  return `file:///${publicDir}${rel}`;
}

const mockSubjects = [
  {
    id: "1",
    name: "Organic Chemistry II",
    description: "Reaction mechanisms, synthesis pathways, and spectroscopy analysis.",
    role: "owner",
    memberCount: 4,
    newCount: 2,
    pinned: true,
  },
  {
    id: "2",
    name: "Computer Systems & Architecture",
    description: "Digital logic, pipelining, cache hierarchies, and assembly programming.",
    role: "editor",
    memberCount: 8,
    newCount: 0,
    pinned: true,
  },
  {
    id: "3",
    name: "Linear Algebra & Matrix Theory",
    description: "Vector spaces, eigenvalues, SVD decompositions, and geometric applications.",
    role: "viewer",
    memberCount: 15,
    newCount: 5,
    pinned: false,
  },
  {
    id: "4",
    name: "Cognitive Psychology",
    description: "Memory models, perception, decision making, and neural correlates.",
    role: "owner",
    memberCount: 3,
    newCount: 0,
    pinned: false,
  },
  {
    id: "5",
    name: "Microeconomics Theory",
    description: "Consumer choice, game theory, market structures, and welfare analysis.",
    role: "viewer",
    memberCount: 12,
    newCount: 0,
    pinned: false,
  },
];

function buildHtml(isMobile = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subjects — xor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${cssContent}
    body { font-family: 'Nunito', sans-serif; background: #ffffff; color: #2b2545; }
    h1, h2, h3, .font-display { font-family: 'Fredoka', sans-serif; }
    .card { background: #ffffff; border: 1px solid #E4D9FF; border-radius: 12px; box-shadow: none; }
    .btn { border-radius: 10px; font-family: 'Fredoka', sans-serif; font-weight: 600; }
    .btn-primary { background: #7c3aed; color: #ffffff; border: 1px solid transparent; }
    .btn-secondary { background: transparent; border: 1px solid #E4D9FF; color: #2b2545; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-secondary:hover { background: #f6f2ff; }
  </style>
</head>
<body class="bg-white text-ink ${isMobile ? "" : "h-screen overflow-hidden"}">
  <div class="flex ${isMobile ? "min-h-screen" : "h-screen"} w-full bg-white text-ink">
    
    <!-- DESKTOP PERSISTENT SIDEBAR (Hidden on mobile) -->
    ${
      isMobile
        ? ""
        : `
    <aside class="hidden h-screen w-64 shrink-0 flex-col border-r border-[#E4D9FF] bg-white lg:flex xl:w-72">
      <div class="flex h-full flex-col justify-between p-4 overflow-y-auto">
        <div class="space-y-6">
          <!-- Logo & Brand (No Tagline) -->
          <div class="flex items-center gap-3 px-2 pt-1 pb-2">
            <div class="relative size-10 shrink-0">
              <img src="${getImgSrc("/mascot/logo-icon.webp")}" alt="xor logo" style="width:40px;height:40px;" class="object-contain" />
            </div>
            <span class="font-display text-xl font-bold tracking-tight text-[#2b2545]">xor</span>
          </div>

          <!-- Exactly 4 Plain Navigation Buttons -->
          <nav class="space-y-1" aria-label="Global sidebar navigation">
            <a href="#" class="flex items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 font-display text-sm font-bold text-[#2b2545] hover:bg-[#f6f2ff] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Home</span>
            </a>

            <!-- Active Item: flat tint #F1ECFF, text #7c3aed, 3px left bar -->
            <a href="#" class="flex items-center gap-3.5 rounded-[10px] bg-[#F1ECFF] text-[#7c3aed] border-l-[3px] border-[#7c3aed] pl-3 py-2.5 font-display text-sm font-bold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path></svg>
              <span>Subjects</span>
            </a>

            <a href="#" class="flex items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 font-display text-sm font-bold text-[#2b2545] hover:bg-[#f6f2ff] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
              <span>Calendar</span>
            </a>

            <a href="#" class="flex items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 font-display text-sm font-bold text-[#2b2545] hover:bg-[#f6f2ff] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
              <span>Progress</span>
            </a>
          </nav>
        </div>

        <!-- Clean Footer (No Promo Card) -->
        <div class="px-2 py-4 text-[11px] text-[#6e6888]/60">
          <p>© xor study</p>
        </div>
      </div>
    </aside>
    `
    }

    <!-- MAIN APP AREA (TopBar + Content) -->
    <div class="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <!-- TOP BAR -->
      <header class="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-[#E4D9FF] bg-white/95 px-4 sm:px-6 backdrop-blur-md">
        <div class="flex flex-1 items-center gap-3 max-w-xl">
          ${
            isMobile
              ? `
          <button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E4D9FF] text-[#6e6888]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          `
              : ""
          }
          <!-- Global Search -->
          <div class="relative w-full max-w-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6888]"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input type="search" placeholder="Search subjects, decks, quizzes..." class="w-full rounded-[10px] border border-[#E4D9FF] bg-white py-2 pl-9 pr-4 text-xs sm:text-sm text-[#2b2545] focus:outline-none" />
          </div>
        </div>

        <!-- Right: Streak Pill + Avatar Menu (No Points Pill) -->
        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-[#E4D9FF] bg-white px-3 py-1 text-xs font-bold text-[#2b2545]">
            <span>🔥</span>
            <span>4</span>
          </div>

          <div class="flex items-center gap-2 rounded-[10px] border border-[#E4D9FF] bg-white px-2.5 py-1 text-xs font-bold text-[#2b2545]">
            <span class="grid size-6 place-items-center rounded-[6px] bg-[#ffcc33] text-xs font-bold text-[#2b2545]">X</span>
            <span class="hidden sm:inline">xorreur</span>
          </div>
        </div>
      </header>

      <!-- SUBJECTS CONTENT -->
      <main class="mx-auto max-w-6xl w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <!-- 1. Header Bar: Title, Description, and Actions -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="font-display text-2xl font-bold tracking-tight text-[#2b2545] sm:text-3xl">Subjects</h1>
            <p class="text-xs sm:text-sm text-[#6e6888]">All your classes, subjects, and collaborative workspaces.</p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <button type="button" class="btn btn-secondary px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5 3.5-3.5M9 15l-4.5 4.5A2.12 2.12 0 0 1 1.5 18v-3L10 6.5l3.5 3.5L9 15Z"></path></svg>
              <span>Join with a key</span>
            </button>
            <button type="button" class="btn btn-primary px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>
              <span>New subject</span>
            </button>
          </div>
        </div>

        <!-- 2. Controls Row: Single Search + Horizontal Tabs (All, Mine, Shared, Pinned) -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button type="button" class="flex items-center gap-2 rounded-[10px] bg-[#F1ECFF] text-[#7c3aed] px-3.5 py-1.5 font-display text-xs sm:text-sm font-bold">
              <span>All</span>
              <span class="rounded-[6px] bg-[#7c3aed]/15 px-1.5 py-0.2 text-[11px] font-semibold text-[#7c3aed]">5</span>
            </button>
            <button type="button" class="flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 font-display text-xs sm:text-sm font-bold text-[#6e6888] hover:bg-[#f6f2ff] hover:text-[#2b2545]">
              <span>Mine</span>
              <span class="rounded-[6px] bg-[#f6f2ff] px-1.5 py-0.2 text-[11px] font-semibold text-[#6e6888]">2</span>
            </button>
            <button type="button" class="flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 font-display text-xs sm:text-sm font-bold text-[#6e6888] hover:bg-[#f6f2ff] hover:text-[#2b2545]">
              <span>Shared</span>
              <span class="rounded-[6px] bg-[#f6f2ff] px-1.5 py-0.2 text-[11px] font-semibold text-[#6e6888]">3</span>
            </button>
            <button type="button" class="flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 font-display text-xs sm:text-sm font-bold text-[#6e6888] hover:bg-[#f6f2ff] hover:text-[#2b2545]">
              <span>Pinned</span>
              <span class="rounded-[6px] bg-[#f6f2ff] px-1.5 py-0.2 text-[11px] font-semibold text-[#6e6888]">2</span>
            </button>
          </div>

          <!-- Single Search Input -->
          <div class="relative w-full sm:w-72">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6888]"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input type="search" placeholder="Search subjects..." class="w-full rounded-[10px] border border-[#E4D9FF] bg-white pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#2b2545] focus:outline-none" />
          </div>
        </div>

        <!-- 3. Subjects Card Grid with "New Subject" Tile First -->
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <!-- New Subject Tile -->
          <li class="h-full">
            <div class="flex h-full min-h-[200px] w-full flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#E4D9FF] bg-white/60 p-5 text-center transition-colors hover:border-[#7c3aed]/60 hover:bg-[#f6f2ff]/30 cursor-pointer">
              <div class="grid size-11 place-items-center rounded-[10px] bg-[#efe7ff] text-[#7c3aed]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>
              </div>
              <h2 class="mt-3 font-display text-base font-bold text-[#2b2545]">New subject</h2>
              <p class="mt-1 text-xs text-[#6e6888]">Create a workspace with flashcards and quizzes.</p>
              <span class="btn btn-primary px-3 py-1 text-xs mt-3">+ Create</span>
            </div>
          </li>

          <!-- Subject Cards -->
          ${mockSubjects
            .map(
              (s, idx) => `
          <li class="relative h-full">
            <div class="card flex h-full flex-col justify-between p-4 transition-transform">
              <div>
                <!-- Top Cover banner -->
                <div class="relative mb-3 h-24 w-full rounded-[10px] bg-gradient-to-br ${
                  idx % 3 === 0
                    ? "from-[#7c3aed]/20 to-[#ffcc33]/20"
                    : idx % 3 === 1
                      ? "from-[#ffcc33]/20 to-[#16a34a]/20"
                      : "from-[#7c3aed]/15 to-[#e5484d]/15"
                } flex items-center justify-center overflow-hidden">
                  <span class="font-display font-bold text-lg opacity-20 text-[#2b2545]">${s.name.slice(0, 3).toUpperCase()}</span>
                  ${
                    s.newCount > 0
                      ? `<span class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#e5484d] px-2 py-0.5 font-display text-xs font-bold text-white shadow-xs">${s.newCount} new</span>`
                      : ""
                  }
                  <div class="absolute right-2 top-2 grid size-7 place-items-center rounded-[10px] ${
                    s.pinned ? "bg-[#7c3aed] text-white" : "bg-white/80 text-[#6e6888]"
                  }">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="${s.pinned ? "white" : "none"}" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="17" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                  </div>
                </div>

                <h2 class="font-display text-base font-bold text-[#2b2545] truncate">${s.name}</h2>
                <p class="mt-1 line-clamp-2 text-xs text-[#6e6888] leading-relaxed">${s.description}</p>
              </div>

              <div class="mt-4 flex items-center justify-between border-t border-[#E4D9FF] pt-3 text-xs">
                <span class="inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 font-bold ${
                  s.role === "owner"
                    ? "bg-[#efe7ff] text-[#7c3aed]"
                    : s.role === "editor"
                      ? "bg-[#fff5d1] text-[#2b2545]"
                      : "bg-[#f6f2ff] text-[#6e6888]"
                }">
                  <span class="capitalize">${s.role}</span>
                </span>
                <span class="flex items-center gap-1 font-semibold text-[#6e6888]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  ${s.memberCount}
                </span>
              </div>
            </div>
          </li>
          `,
            )
            .join("")}
        </ul>
      </main>
    </div>
  </div>
</body>
</html>`;
}

// Write temporary HTML files
const desktopHtmlPath = path.resolve("scripts/subjects_1440x900.html");
const mobileHtmlPath = path.resolve("scripts/subjects_390x844.html");

fs.writeFileSync(desktopHtmlPath, buildHtml(false));
fs.writeFileSync(mobileHtmlPath, buildHtml(true));

const desktopPng = path.join(artifactDir, "subjects_1440x900.png");
const mobilePng = path.join(artifactDir, "subjects_390x844.png");

console.log("Capturing 1440x900 screenshot...");
execSync(
  `"${chromePath}" --headless=new --screenshot="${desktopPng}" --window-size=1440,900 --hide-scrollbars "file:///${desktopHtmlPath.replace(/\\/g, "/")}"`,
  { stdio: "inherit" }
);

console.log("Capturing 390x844 screenshot...");
execSync(
  `"${chromePath}" --headless=new --screenshot="${mobilePng}" --window-size=390,844 --hide-scrollbars "file:///${mobileHtmlPath.replace(/\\/g, "/")}"`,
  { stdio: "inherit" }
);

console.log("Done! Screenshots saved to:", desktopPng, mobilePng);

