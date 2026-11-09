import React from "react";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { NightSky } from "./SceneSkyElements";
import { SCENE_COMPOSITION_CONFIG } from "./sceneCompositionConfig";
import type { SceneProps } from "./SceneMorning";

export function DesktopSceneNight({ className }: SceneProps) {
  const config = SCENE_COMPOSITION_CONFIG.evening;
  const { books, cottage } = config;

  return (
    <svg
      viewBox="0 0 1600 560"
      preserveAspectRatio="xMaxYMax slice"
      className={className ?? "w-full h-full"}
      aria-hidden="true"
    >
      <defs>
        {/* Sky gradient: Deep midnight indigo at top fading down into rich deep violet at horizon */}
        <linearGradient id="night-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#140B38" />
          <stop offset="45%" stopColor="#22114E" />
          <stop offset="80%" stopColor="#371866" />
          <stop offset="100%" stopColor="#4A227D" />
        </linearGradient>

        {/* Distant hill gradient */}
        <linearGradient id="night-hill-dist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F367D" />
          <stop offset="100%" stopColor="#3C2566" />
        </linearGradient>

        {/* Mid hill gradient */}
        <linearGradient id="night-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5D3A94" />
          <stop offset="100%" stopColor="#452575" />
        </linearGradient>

        {/* Foreground left hill gradient */}
        <linearGradient id="night-hill-fore-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3C1E69" />
          <stop offset="100%" stopColor="#2A1150" />
        </linearGradient>

        {/* Foreground right hill gradient */}
        <linearGradient id="night-hill-fore-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34185C" />
          <stop offset="100%" stopColor="#220D42" />
        </linearGradient>
      </defs>

      {/* 1. Base Sky Rectangle */}
      <rect width="1600" height="560" fill="url(#night-sky-grad)" />

      {/* 2. Night Sky Elements (Crescent Moon, twinkling stars, dark violet clouds) */}
      <NightSky
        moonGlow="#FFE082"
        moonCore="#FFEB99"
        cloudFill="#28144D"
        cloudEdge="#3A1D6B"
        starColor="#FFF9C4"
      />

      {/* 3. Far Hills (Distant & Middle rolling hills) */}
      <g className="desktop-far-hills" aria-hidden="true">
        {/* Distant rolling hill layer */}
        <path
          d="M-20,410 C260,400 440,435 660,395 C860,360 990,385 1180,340 C1340,300 1480,335 1620,355 L1620,570 L-20,570 Z"
          fill="url(#night-hill-dist)"
        />

        {/* Middle hill layer */}
        <path
          d="M-20,465 C240,475 480,455 740,425 C840,415 940,412 1050,385 C1180,355 1320,390 1480,415 C1540,425 1580,435 1620,440 L1620,570 L-20,570 Z"
          fill="url(#night-hill-dist)"
        />
      </g>

      {/* 4. Winding storybook path from cottage doorstep to front */}
      <path
        d="M1050,396 C1025,412 995,432 955,452 C900,480 850,510 785,565 L895,565 C950,518 995,488 1035,455 C1065,428 1083,410 1073,396 Z"
        fill="#563D78"
        stroke="#452D64"
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
          glow={true}
          sparkleFill="#FFE082"
          bookPurpleDark="#2B0C48"
          bookPurpleMid="#4D1E79"
          bookPurpleLight="#6C339F"
          bookGold="#FFD54F"
          bookAmber="#FFA726"
          pagesFill="#FFF8E7"
          floatingPaperFill="#FFFDF5"
        />
      </g>

      {/* 6. Storybook Cottage (Sits right of books at 62-74%) */}
      <g data-cottage="true" transform={`translate(${cottage.offsetX} ${cottage.offsetY})`}>
        <SceneCottage
          roofFill="#522479"
          roofShingles="#3C145C"
          wallFill="#76548A"
          wallShade="#56366A"
          trimFill="#3C145C"
          doorFill="#2A0B45"
          awningFill="#522479"
          windowState="glowing"
          chimneyFill="#522479"
          smokeFill="#C8B2DE"
          treeFillFar="#3D1D63"
          treeFillNear="#4F2A7E"
        />
      </g>

      {/* 7. Foreground Hills (Tucks under books/cottage and provides flat knoll for standing corgi) */}
      <g className="desktop-fore-hills" aria-hidden="true">
        {/* Left foreground hill (calm floor for text and button zone) */}
        <path
          d="M-20,490 C180,475 360,505 540,535 C680,555 860,560 1100,565 L1100,570 L-20,570 Z"
          fill="url(#night-hill-fore-l)"
        />

        {/* Right foreground hill with smooth flat knoll for standing corgi (x: 1360-1530 at y: 492) */}
        <path
          d="M1080,565 C1180,520 1280,492 1360,492 C1450,492 1530,494 1620,505 L1620,570 L1080,570 Z"
          fill="url(#night-hill-fore-r)"
        />
      </g>
    </svg>
  );
}

