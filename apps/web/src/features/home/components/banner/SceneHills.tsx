import React from "react";

export interface SceneHillsProps {
  distantFill: string;
  midFill: string;
  foreLeftFill: string;
  foreRightFill: string;
  pathFill: string;
  pathBorder?: string;
}

export function SceneHills({
  distantFill,
  midFill,
  foreLeftFill,
  foreRightFill,
  pathFill,
  pathBorder,
}: SceneHillsProps) {
  return (
    <g className="scene-hills" aria-hidden="true">
      {/* 1. Distant rolling hill layer */}
      <path
        d="M-20,410 C260,400 440,435 660,395 C860,360 990,385 1180,340 C1340,300 1480,335 1620,355 L1620,570 L-20,570 Z"
        fill={distantFill}
      />

      {/* 2. Middle hill layer with the flat knoll (x=760-960) for corgi & cottage */}
      <path
        d="M-20,465 C240,475 480,455 740,425 C840,415 940,412 1050,385 C1180,355 1320,390 1480,415 C1540,425 1580,435 1620,440 L1620,570 L-20,570 Z"
        fill={midFill}
      />

      {/* 3. Winding storybook path from cottage doorstep to front */}
      <path
        d="M1065,396 C1040,412 1010,432 970,452 C915,480 865,510 800,565 L910,565 C965,518 1010,488 1050,455 C1080,428 1098,410 1088,396 Z"
        fill={pathFill}
        stroke={pathBorder}
        strokeWidth={pathBorder ? 1.5 : 0}
      />

      {/* 4. Left foreground rolling hill (creating calm open floor for text) */}
      <path
        d="M-20,490 C180,475 360,505 540,535 C680,555 860,560 1100,565 L1100,570 L-20,570 Z"
        fill={foreLeftFill}
      />

      {/* 5. Right foreground hill (under book stack) */}
      <path
        d="M1100,565 C1220,520 1380,465 1620,485 L1620,570 L1100,570 Z"
        fill={foreRightFill}
      />
    </g>
  );
}
