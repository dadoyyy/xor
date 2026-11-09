import React from "react";
import { SceneHills } from "./SceneHills";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { MorningSky } from "./SceneSkyElements";

export interface SceneProps {
  className?: string;
}

export function SceneMorning({ className }: SceneProps) {
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

      {/* 3. Rolling Hill Layers & Winding Path */}
      <SceneHills
        distantFill="url(#morning-hill-dist)"
        midFill="url(#morning-hill-mid)"
        foreLeftFill="url(#morning-hill-fore-l)"
        foreRightFill="url(#morning-hill-fore-r)"
        pathFill="#F5E8DB"
        pathBorder="#E8D5C2"
      />

      {/* 4. Storybook Cottage (Unlit windows in morning daylight) */}
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

      {/* 5. Tall Magical Book Stack on Far Right */}
      <SceneBooks
        glow={false}
        sparkleFill="#F7CA50"
        bookPurpleDark="#532279"
        bookPurpleMid="#6C3599"
        bookPurpleLight="#8548B8"
        bookGold="#F7CA50"
        bookAmber="#EBA82C"
        pagesFill="#FFFDF5"
        floatingPaperFill="#FFFDF7"
      />
    </svg>
  );
}

export default SceneMorning;
