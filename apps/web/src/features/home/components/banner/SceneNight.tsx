import React from "react";
import { SceneHills } from "./SceneHills";
import { SceneCottage } from "./SceneCottage";
import { SceneBooks } from "./SceneBooks";
import { NightSky } from "./SceneSkyElements";
import type { SceneProps } from "./SceneMorning";

export function SceneNight({ className }: SceneProps) {
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

      {/* 3. Rolling Deep Purple Hills & Winding Night Path */}
      <SceneHills
        distantFill="url(#night-hill-dist)"
        midFill="url(#night-hill-mid)"
        foreLeftFill="url(#night-hill-fore-l)"
        foreRightFill="url(#night-hill-fore-r)"
        pathFill="#563D78"
        pathBorder="#452D64"
      />

      {/* 4. Storybook Cottage (Glowing golden windows & light pooling on path) */}
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

      {/* 5. Tall Magical Book Stack on Far Right with Faint Ambient Glow */}
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
    </svg>
  );
}

export default SceneNight;
