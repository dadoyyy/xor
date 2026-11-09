import React from "react";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { AfternoonSky } from "./SceneSkyElements";
import { SCENE_COMPOSITION_CONFIG } from "./sceneCompositionConfig";
import type { SceneProps } from "./SceneMorning";

export function DesktopSceneAfternoon({ className }: SceneProps) {
  const config = SCENE_COMPOSITION_CONFIG.afternoon;
  const { books, cottage } = config;

  return (
    <svg
      viewBox="0 0 1600 560"
      preserveAspectRatio="xMaxYMax slice"
      className={className ?? "w-full h-full"}
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient: Bright lavender at top fading to pale cream at horizon */}
        <linearGradient id="afternoon-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4B0F7" />
          <stop offset="50%" stopColor="#D9CBF8" />
          <stop offset="80%" stopColor="#ECE4F9" />
          <stop offset="100%" stopColor="#F9F4FC" />
        </linearGradient>

        {/* Distant hill gradient */}
        <linearGradient id="afternoon-hill-dist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DFCBF8" />
          <stop offset="100%" stopColor="#CBB1EE" />
        </linearGradient>

        {/* Mid hill gradient */}
        <linearGradient id="afternoon-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BC95E9" />
          <stop offset="100%" stopColor="#9C6CD7" />
        </linearGradient>

        {/* Foreground left hill gradient */}
        <linearGradient id="afternoon-hill-fore-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9262CF" />
          <stop offset="100%" stopColor="#7B49BD" />
        </linearGradient>

        {/* Foreground right hill gradient */}
        <linearGradient id="afternoon-hill-fore-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8753C7" />
          <stop offset="100%" stopColor="#6C39AF" />
        </linearGradient>
      </defs>

      {/* 1. Base Sky Rectangle */}
      <rect width="1600" height="560" fill="url(#afternoon-sky-grad)" />

      {/* 2. Sky Elements (High bright sun, fluffy clouds, sparkles) */}
      <AfternoonSky
        sunGlow="#FFE28A"
        sunCore="#FFD54F"
        cloudFill="#FFFFFF"
        cloudShadow="#D9CBEE"
        sparkleFill="#FFE082"
      />

      {/* 3. Far Hills (Distant & Middle rolling hills) */}
      <g className="desktop-far-hills" aria-hidden="true">
        {/* Distant rolling hill layer */}
        <path
          d="M-20,410 C260,400 440,435 660,395 C860,360 990,385 1180,340 C1340,300 1480,335 1620,355 L1620,570 L-20,570 Z"
          fill="url(#afternoon-hill-dist)"
        />

        {/* Middle hill layer */}
        <path
          d="M-20,465 C240,475 480,455 740,425 C840,415 940,412 1050,385 C1180,355 1320,390 1480,415 C1540,425 1580,435 1620,440 L1620,570 L-20,570 Z"
          fill="url(#afternoon-hill-mid)"
        />
      </g>

      {/* 4. Winding storybook path from cottage doorstep to front */}
      <path
        d="M1050,396 C1025,412 995,432 955,452 C900,480 850,510 785,565 L895,565 C950,518 995,488 1035,455 C1065,428 1083,410 1073,396 Z"
        fill="#ECE2F2"
        stroke="#DACAE2"
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
          sparkleFill="#FFD54F"
          bookPurpleDark="#4A1974"
          bookPurpleMid="#672F98"
          bookPurpleLight="#8447BA"
          bookGold="#FFD54F"
          bookAmber="#F5AF25"
          pagesFill="#FFFDF8"
          floatingPaperFill="#FFFFFF"
        />
      </g>

      {/* 6. Storybook Cottage (Sits right of books at 62-74%) */}
      <g data-cottage="true" transform={`translate(${cottage.offsetX} ${cottage.offsetY})`}>
        <SceneCottage
          roofFill="#693496"
          roofShingles="#502078"
          wallFill="#F8F3EA"
          wallShade="#E2D7C8"
          trimFill="#502078"
          doorFill="#3A125E"
          awningFill="#693496"
          windowState="soft"
          chimneyFill="#693496"
          smokeFill="#FFFFFF"
          treeFillFar="#7844A8"
          treeFillNear="#8E5ABC"
        />
      </g>

      {/* 7. Foreground Hills (Tucks under books/cottage and provides flat knoll for standing corgi) */}
      <g className="desktop-fore-hills" aria-hidden="true">
        {/* Left foreground hill (calm floor for text and button zone) */}
        <path
          d="M-20,490 C180,475 360,505 540,535 C680,555 860,560 1100,565 L1100,570 L-20,570 Z"
          fill="url(#afternoon-hill-fore-l)"
        />

        {/* Right foreground hill with smooth flat knoll for standing corgi (x: 1360-1530 at y: 492) */}
        <path
          d="M1080,565 C1180,520 1280,492 1360,492 C1450,492 1530,494 1620,505 L1620,570 L1080,570 Z"
          fill="url(#afternoon-hill-fore-r)"
        />
      </g>
    </svg>
  );
}

