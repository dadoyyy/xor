// Script to verify Mascot Backdrop Contrast Ratios
// Requirements:
// 1. Backdrop must be visibly distinct from the card: >= 1.15:1 luminance ratio against card surface.
// 2. Corgi's outline must remain clearly visible on it: >= 3:1 against corgi dark outline.

function hexToLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const CORGI_OUTLINE = '#2B1B5A'; // dark ink outline

const PAIRS = [
  { surfaceName: 'lilac', surfaceHex: '#EFE9FF', tokenName: '--mascot-bg-on-lilac', backdropHex: '#FED770' },
  { surfaceName: 'neutral', surfaceHex: '#F7F5FF', tokenName: '--mascot-bg-on-neutral', backdropHex: '#FED770' },
  { surfaceName: 'cream', surfaceHex: '#FFFBF0', tokenName: '--mascot-bg-on-cream', backdropHex: '#E4D9FF' },
  { surfaceName: 'yellow', surfaceHex: '#FFF1C2', tokenName: '--mascot-bg-on-yellow', backdropHex: '#E4D9FF' },
  { surfaceName: 'white', surfaceHex: '#FFFFFF', tokenName: '--mascot-bg-on-white', backdropHex: '#FED770' },
  { surfaceName: 'white-alt', surfaceHex: '#FFFFFF', tokenName: '--mascot-bg-on-white-alt', backdropHex: '#EFE9FF' },
];

console.log('=== MASCOT BACKDROP CONTRAST VERIFICATION ===\n');

let allPassed = true;
const results = PAIRS.map(p => {
  const surfaceRatio = contrast(p.surfaceHex, p.backdropHex);
  const corgiRatio = contrast(CORGI_OUTLINE, p.backdropHex);
  const passSurface = surfaceRatio >= 1.15;
  const passCorgi = corgiRatio >= 3.0;
  if (!passSurface || !passCorgi) allPassed = false;

  return {
    Surface: `${p.surfaceName} (${p.surfaceHex})`,
    BackdropToken: p.tokenName,
    BackdropHex: p.backdropHex,
    'Surface Contrast': `${surfaceRatio.toFixed(2)} : 1`,
    'Surface Target': '>= 1.15 : 1',
    'Corgi Contrast': `${corgiRatio.toFixed(2)} : 1`,
    'Corgi Target': '>= 3.0 : 1',
    Status: passSurface && passCorgi ? 'PASS' : 'FAIL',
  };
});

console.table(results);

if (!allPassed) {
  console.error('\nFAIL: One or more mascot backdrop pairs failed contrast thresholds!');
  process.exit(1);
} else {
  console.log('\nSUCCESS: All mascot backdrop pairs pass contrast thresholds.');
}

