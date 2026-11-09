import React from "react";
import { SceneHills } from "./SceneHills";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { AfternoonSky } from "./SceneSkyElements";
import type { SceneProps } from "./SceneMorning";

export function SceneAfternoon({ className }: SceneProps) {
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

      {/* 3. Rolling Hill Layers & Winding Path */}
      <SceneHills
        distantFill="url(#afternoon-hill-dist)"
        midFill="url(#afternoon-hill-mid)"
        foreLeftFill="url(#afternoon-hill-fore-l)"
        foreRightFill="url(#afternoon-hill-fore-r)"
        pathFill="#ECE2F2"
        pathBorder="#DACAE2"
      />

      {/* 4. Storybook Cottage (Softly lit windows) */}
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

      {/* 5. Tall Magical Book Stack on Far Right */}
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
    </svg>
  );
}

export default SceneAfternoon;
