import React from "react";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { MorningSky } from "./SceneSkyElements";
import { SCENE_COMPOSITION_CONFIG } from "./sceneCompositionConfig";
import type { SceneProps } from "./SceneMorning";

export function DesktopSceneMorning({ className }: SceneProps) {
  const config = SCENE_COMPOSITION_CONFIG.morning;
  const { books, cottage } = config;

  return (
    <svg
      viewBox="0 0 1600 560"
      preserveAspectRatio="xMaxYMax slice"
      className={className ?? "w-full h-full"}
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient: Lavender at top, fading down to warm peach/cream sunrise at horizon */}
        <linearGradient id="morning-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B39BF2" />
          <stop offset="45%" stopColor="#D2BDF7" />
          <stop offset="75%" stopColor="#F5DFEE" />
          <stop offset="100%" stopColor="#FFE7CD" />
        </linearGradient>

        {/* Distant hill gradient */}
        <linearGradient id="morning-hill-dist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E6D3F5" />
          <stop offset="100%" stopColor="#DFC3F2" />
        </linearGradient>

        {/* Mid hill gradient */}
        <linearGradient id="morning-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A7EB" />
          <stop offset="100%" stopColor="#BE8FE0" />
        </linearGradient>

        {/* Foreground left hill gradient */}
        <linearGradient id="morning-hill-fore-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B88DE3" />
          <stop offset="100%" stopColor="#A372D6" />
        </linearGradient>

        {/* Foreground right hill gradient */}
        <linearGradient id="morning-hill-fore-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A979DC" />
          <stop offset="100%" stopColor="#925FCB" />
        </linearGradient>
      </defs>

      {/* 1. Base Sky Rectangle */}
      <rect width="1600" height="560" fill="url(#morning-sky-grad)" />

      {/* 2. Sky Elements (Low morning sun, cream clouds, sparkles, birds) */}
      <MorningSky
        sunGlow="#FFE28A"
        sunCore="#FFD54F"
        cloudFill="#FFFDF8"
        cloudShadow="#F2DEEA"
        sparkleFill="#FFE477"
      />

      {/* 3. Far Hills (Distant & Middle rolling hills) */}
      <g className="desktop-far-hills" aria-hidden="true">
        {/* Distant rolling hill layer */}
        <path
          d="M-20,410 C260,400 440,435 660,395 C860,360 990,385 1180,340 C1340,300 1480,335 1620,355 L1620,570 L-20,570 Z"
          fill="url(#morning-hill-dist)"
        />

        {/* Middle hill layer */}
        <path
          d="M-20,465 C240,475 480,455 740,425 C840,415 940,412 1050,385 C1180,355 1320,390 1480,415 C1540,425 1580,435 1620,440 L1620,570 L-20,570 Z"
          fill="url(#morning-hill-mid)"
        />
      </g>

      {/* 4. Winding storybook path from cottage doorstep to front */}
      <path
        d="M1050,396 C1025,412 995,432 955,452 C900,480 850,510 785,565 L895,565 C950,518 995,488 1035,455 C1065,428 1083,410 1073,396 Z"
        fill="#F5E8DB"
        stroke="#E8D5C2"
        strokeWidth={1.5}
      />

      {/* 5. Book Stack (Moves to LEFT of cottage at 46-58%, behind cottage and behind front hill) */}
      {/* On desktop (>=1360px), visible behind cottage. On tablet/narrow cards, hidden first to preserve >=24px clearance */}
      <g
        data-books="true"
        className="hidden min-[1360px]:inline"
        opacity={books.opacity}
        transform={`translate(${books.targetX} ${books.targetY}) scale(${books.scale}) translate(-1360 -410)`}
      >
        <SceneBooks
          glow={false}
          sparkleFill="#F7CA50"
          bookPurpleDark="#532279"
          bookPurpleMid="#6C3599"
          bookPurpleLight="#8548B8"
          bookGold="#F7CA50"
          bookAmber="#EBA82C"
          pagesFill="#FFFDF5"
          floatingPaperFill="#FFFDF8"
        />
      </g>

      {/* 6. Storybook Cottage (Sits right of books at 62-74%) */}
      <g data-cottage="true" transform={`translate(${cottage.offsetX} ${cottage.offsetY})`}>
        <SceneCottage
          roofFill="#773E9C"
          roofShingles="#5E2C82"
          wallFill="#FAF4E8"
          wallShade="#E6DCCB"
          trimFill="#5E2C82"
          doorFill="#481F66"
          awningFill="#773E9C"
          windowState="unlit"
          chimneyFill="#773E9C"
          smokeFill="#FFF9EE"
          treeFillFar="#8C5BAE"
          treeFillNear="#A16DC4"
        />
      </g>

      {/* 7. Foreground Hills (Tucks under books/cottage and provides flat knoll for standing corgi) */}
      <g className="desktop-fore-hills" aria-hidden="true">
        {/* Left foreground hill (calm floor for text and button zone) */}
        <path
          d="M-20,490 C180,475 360,505 540,535 C680,555 860,560 1100,565 L1100,570 L-20,570 Z"
          fill="url(#morning-hill-fore-l)"
        />

        {/* Right foreground hill with smooth flat knoll for standing corgi (x: 1360-1530 at y: 492) */}
        <path
          d="M1080,565 C1180,520 1280,492 1360,492 C1450,492 1530,494 1620,505 L1620,570 L1080,570 Z"
          fill="url(#morning-hill-fore-r)"
        />
      </g>
    </svg>
  );
}

