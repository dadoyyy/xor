import fs from "fs";
import path from "path";
import sharp from "sharp";

const SRC_DIR = path.resolve("assets-src/covers");
const OUT_DIRS = [
  path.resolve("public/mascot/covers"),
  path.resolve("apps/web/public/mascot/covers"),
];

// Manifest image IDs expected
export const CORGI_IMAGE_IDS = [
  "corgi-reading",
  "corgi-science",
  "corgi-math",
  "corgi-coding",
  "corgi-art",
  "corgi-music",
  "corgi-history",
  "corgi-language",
  "corgi-nature",
  "corgi-space",
  "corgi-night-study",
  "corgi-team",
  "corgi-sleepy",
  "paw-pattern",
  "bone-pattern",
  "corgi-faces",
];

// Ensure output directories exist
for (const outDir of OUT_DIRS) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "thumbs"), { recursive: true });
}

console.log("=== Building Cover Assets (960x360 & 240x90 WebP) ===\n");

const results = [];
const missing = [];

for (const id of CORGI_IMAGE_IDS) {
  // Look for .png, .jpg, or .jpeg in SRC_DIR
  let srcFile = null;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const candidate = path.join(SRC_DIR, `${id}${ext}`);
    if (fs.existsSync(candidate)) {
      srcFile = candidate;
      break;
    }
  }

  if (!srcFile) {
    missing.push(id);
    results.push({
      id,
      status: "MISSING_SOURCE",
      displaySize: "-",
      thumbSize: "-",
    });
    continue;
  }

  try {
    // Generate display WebP (960x360, centered crop)
    const displayBuffer = await sharp(srcFile)
      .resize(960, 360, { fit: "cover", position: "center" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();

    // Generate thumb WebP (240x90, centered crop)
    const thumbBuffer = await sharp(srcFile)
      .resize(240, 90, { fit: "cover", position: "center" })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();

    for (const outDir of OUT_DIRS) {
      fs.writeFileSync(path.join(outDir, `${id}.webp`), displayBuffer);
      fs.writeFileSync(path.join(outDir, "thumbs", `${id}.webp`), thumbBuffer);
    }

    results.push({
      id,
      status: "BUILT",
      displaySize: `${(displayBuffer.length / 1024).toFixed(1)} KB`,
      thumbSize: `${(thumbBuffer.length / 1024).toFixed(1)} KB`,
    });
  } catch (err) {
    console.error(`Error processing ${id}:`, err.message);
    results.push({
      id,
      status: `ERROR: ${err.message}`,
      displaySize: "-",
      thumbSize: "-",
    });
  }
}

// Print formatted table
console.log(
  "ID".padEnd(20) +
    "Status".padEnd(18) +
    "Display (960x360)".padEnd(20) +
    "Thumb (240x90)"
);
console.log("-".repeat(74));
for (const r of results) {
  console.log(
    r.id.padEnd(20) +
      r.status.padEnd(18) +
      r.displaySize.padEnd(20) +
      r.thumbSize
  );
}

console.log("-".repeat(74));
console.log(`Total items: ${CORGI_IMAGE_IDS.length}`);
console.log(`Built successfully: ${results.filter((r) => r.status === "BUILT").length}`);
console.log(`Missing source files: ${missing.length} (${missing.join(", ")})`);

if (missing.length > 0) {
  console.log("\nNote: Placeholder rendering will be used for missing covers until source files are provided.");
}

