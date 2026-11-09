import React from "react";

export interface SceneBooksProps {
  glow?: boolean;
  sparkleFill?: string;
  bookPurpleDark: string;
  bookPurpleMid: string;
  bookPurpleLight: string;
  bookGold: string;
  bookAmber: string;
  pagesFill: string;
  floatingPaperFill: string;
}

export function SceneBooks({
  glow = false,
  sparkleFill = "#FFE082",
  bookPurpleDark,
  bookPurpleMid,
  bookPurpleLight,
  bookGold,
  bookAmber,
  pagesFill,
  floatingPaperFill,
}: SceneBooksProps) {
  return (
    <g className="scene-books" aria-hidden="true">
      {/* Optional ambient magical glow around books for night */}
      {glow && (
        <ellipse
          cx="1370"
          cy="320"
          rx="120"
          ry="150"
          fill="#FFE082"
          opacity={0.12}
        />
      )}

      {/* Book 1 (Bottom, largest tome) */}
      <g>
        {/* Cover shadow / base */}
        <rect x="1270" y="405" width="180" height="36" rx="4" fill={bookPurpleDark} />
        {/* Pages block */}
        <rect x="1285" y="410" width="160" height="26" rx="2" fill={pagesFill} />
        {/* Page line striations */}
        <line x1="1290" y1="418" x2="1440" y2="418" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        <line x1="1290" y1="426" x2="1440" y2="426" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        {/* Spine & front edge */}
        <rect x="1268" y="403" width="20" height="40" rx="3" fill={bookPurpleDark} />
        {/* Gold spine decorative bands */}
        <line x1="1268" y1="411" x2="1288" y2="411" stroke={bookGold} strokeWidth="2.5" />
        <line x1="1268" y1="435" x2="1288" y2="435" stroke={bookGold} strokeWidth="2.5" />
      </g>

      {/* Book 2 (Gold / Amber study tome, angled slightly) */}
      <g transform="rotate(-1.5 1360 380)">
        <rect x="1285" y="372" width="165" height="34" rx="4" fill={bookAmber} />
        <rect x="1298" y="377" width="148" height="24" rx="2" fill={pagesFill} />
        <line x1="1302" y1="384" x2="1442" y2="384" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        <line x1="1302" y1="392" x2="1442" y2="392" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        <rect x="1283" y="370" width="18" height="38" rx="3" fill={bookGold} />
        <circle cx="1292" cy="389" r="3.5" fill={bookPurpleDark} />
      </g>

      {/* Book 3 (Deep violet textbook) */}
      <g transform="rotate(1.2 1360 345)">
        <rect x="1275" y="340" width="172" height="32" rx="4" fill={bookPurpleMid} />
        <rect x="1290" y="344" width="152" height="24" rx="2" fill={pagesFill} />
        <line x1="1295" y1="352" x2="1438" y2="352" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        <line x1="1295" y1="360" x2="1438" y2="360" stroke="#E0D6C8" strokeWidth="1" opacity={0.6} />
        <rect x="1273" y="338" width="19" height="36" rx="3" fill={bookPurpleDark} />
        <line x1="1273" y1="347" x2="1292" y2="347" stroke={bookGold} strokeWidth="2" />
        <line x1="1273" y1="365" x2="1292" y2="365" stroke={bookGold} strokeWidth="2" />
        {/* Dangling satin bookmark ribbon */}
        <path
          d="M1410,366 Q1418,390 1412,415 L1418,422 L1424,415 Q1422,390 1416,366 Z"
          fill={bookGold}
        />
      </g>

      {/* Book 4 (Warm gold volume) */}
      <g transform="rotate(-2 1360 315)">
        <rect x="1290" y="310" width="158" height="30" rx="3" fill={bookGold} />
        <rect x="1302" y="314" width="142" height="22" rx="2" fill={pagesFill} />
        <rect x="1288" y="308" width="17" height="34" rx="3" fill={bookAmber} />
        <line x1="1288" y1="316" x2="1305" y2="316" stroke={bookPurpleDark} strokeWidth="1.8" />
        <line x1="1288" y1="334" x2="1305" y2="334" stroke={bookPurpleDark} strokeWidth="1.8" />
      </g>

      {/* Book 5 (Royal purple textbook) */}
      <g transform="rotate(1.8 1360 285)">
        <rect x="1280" y="280" width="168" height="30" rx="3" fill={bookPurpleLight} />
        <rect x="1294" y="284" width="150" height="22" rx="2" fill={pagesFill} />
        <rect x="1278" y="278" width="18" height="34" rx="3" fill={bookPurpleMid} />
        <line x1="1278" y1="286" x2="1296" y2="286" stroke={bookGold} strokeWidth="2" />
        <line x1="1278" y1="304" x2="1296" y2="304" stroke={bookGold} strokeWidth="2" />
        {/* Purple ribbon bookmark hanging down */}
        <path
          d="M1390,304 Q1395,325 1391,348 L1396,354 L1401,348 Q1400,325 1395,304 Z"
          fill={bookPurpleDark}
        />
      </g>

      {/* Book 6 (Top book - angled and slightly open with star emblem) */}
      <g transform="rotate(-3 1355 255)">
        <rect x="1295" y="250" width="148" height="30" rx="3" fill={bookPurpleDark} />
        <rect x="1308" y="254" width="131" height="22" rx="2" fill={pagesFill} />
        <rect x="1293" y="248" width="17" height="34" rx="3" fill={bookPurpleDark} />
        {/* Top cover gold embossed star badge */}
        <polygon
          points="1360,252 1362,257 1367,258 1363,261 1364,266 1360,263 1356,266 1357,261 1353,258 1358,257"
          fill={bookGold}
        />
      </g>

      {/* Magical Floating Loose Study Pages */}
      <g className="floating-pages">
        {/* Page 1 (Left of stack, drifting up) */}
        <g transform="translate(1225 240) rotate(-14)">
          <rect x="0" y="0" width="26" height="34" rx="2" fill={floatingPaperFill} stroke="#D4C8BC" strokeWidth="0.8" />
          <line x1="4" y1="7" x2="22" y2="7" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="13" x2="22" y2="13" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="19" x2="18" y2="19" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="25" x2="15" y2="25" stroke="#A89E90" strokeWidth="0.8" />
        </g>

        {/* Page 2 (Upper left of stack, drifting towards moon/sky) */}
        <g transform="translate(1250 175) rotate(18)">
          <rect x="0" y="0" width="24" height="32" rx="2" fill={floatingPaperFill} stroke="#D4C8BC" strokeWidth="0.8" />
          <line x1="4" y1="6" x2="20" y2="6" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="18" x2="16" y2="18" stroke="#A89E90" strokeWidth="0.8" />
        </g>

        {/* Page 3 (Right side of stack, hovering) */}
        <g transform="translate(1475 220) rotate(16)">
          <rect x="0" y="0" width="24" height="32" rx="2" fill={floatingPaperFill} stroke="#D4C8BC" strokeWidth="0.8" />
          <line x1="4" y1="6" x2="20" y2="6" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="18" x2="14" y2="18" stroke="#A89E90" strokeWidth="0.8" />
        </g>

        {/* Page 4 (Lower right near ground) */}
        <g transform="translate(1460 305) rotate(-10)">
          <rect x="0" y="0" width="22" height="28" rx="2" fill={floatingPaperFill} stroke="#D4C8BC" strokeWidth="0.8" />
          <line x1="4" y1="6" x2="18" y2="6" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="11" x2="18" y2="11" stroke="#A89E90" strokeWidth="0.8" />
          <line x1="4" y1="16" x2="12" y2="16" stroke="#A89E90" strokeWidth="0.8" />
        </g>
      </g>

      {/* Four-pointed Sparkle Stars around books */}
      <g fill={sparkleFill}>
        {/* Large sparkle above stack */}
        <path d="M1365,185 Q1368,198 1381,201 Q1368,204 1365,217 Q1362,204 1349,201 Q1362,198 1365,185 Z" />
        {/* Medium sparkle left */}
        <path d="M1230,215 Q1232,223 1240,225 Q1232,227 1230,235 Q1228,227 1220,225 Q1228,223 1230,215 Z" />
        {/* Medium sparkle right */}
        <path d="M1495,270 Q1497,276 1503,278 Q1497,280 1495,286 Q1493,280 1487,278 Q1493,276 1495,270 Z" />
        {/* Small sparkle lower */}
        <path d="M1260,370 Q1261,375 1266,376 Q1261,377 1260,382 Q1259,377 1254,376 Q1259,375 1260,370 Z" />
        {/* Tiny sparkle right bottom */}
        <circle cx="1480" cy="385" r="2.5" />
        <circle cx="1340" cy="170" r="2" />
        <circle cx="1435" cy="210" r="2.5" />
      </g>
    </g>
  );
}
