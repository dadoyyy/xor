import React from "react";

export interface MorningSkyProps {
  sunGlow: string;
  sunCore: string;
  cloudFill: string;
  cloudShadow: string;
  sparkleFill: string;
}

export function MorningSky({
  sunGlow,
  sunCore,
  cloudFill,
  cloudShadow,
  sparkleFill,
}: MorningSkyProps) {
  return (
    <g className="morning-sky" aria-hidden="true">
      {/* Low rising warm morning sun above right-hand hills */}
      <g>
        <circle cx="1180" cy="180" r="54" fill={sunGlow} opacity={0.3} />
        <circle cx="1180" cy="180" r="38" fill={sunGlow} opacity={0.5} />
        <circle cx="1180" cy="180" r="26" fill={sunCore} />
      </g>

      {/* Gentle morning clouds */}
      {/* Cloud 1: Upper left */}
      <g transform="translate(180 80)">
        <ellipse cx="60" cy="30" rx="65" ry="20" fill={cloudShadow} opacity={0.5} />
        <circle cx="45" cy="22" r="24" fill={cloudFill} />
        <circle cx="75" cy="20" r="20" fill={cloudFill} />
        <circle cx="95" cy="26" r="15" fill={cloudFill} />
        <ellipse cx="60" cy="28" rx="55" ry="14" fill={cloudFill} />
      </g>

      {/* Cloud 2: Center */}
      <g transform="translate(680 60)">
        <ellipse cx="50" cy="24" rx="55" ry="16" fill={cloudShadow} opacity={0.4} />
        <circle cx="35" cy="18" r="20" fill={cloudFill} />
        <circle cx="65" cy="16" r="22" fill={cloudFill} />
        <circle cx="85" cy="22" r="15" fill={cloudFill} />
        <ellipse cx="55" cy="22" rx="45" ry="12" fill={cloudFill} />
      </g>

      {/* Cloud 3: Right behind sun */}
      <g transform="translate(1120 160)">
        <ellipse cx="70" cy="25" rx="75" ry="16" fill={cloudShadow} opacity={0.3} />
        <circle cx="50" cy="18" r="20" fill={cloudFill} opacity={0.9} />
        <circle cx="85" cy="16" r="24" fill={cloudFill} opacity={0.9} />
        <circle cx="115" cy="22" r="18" fill={cloudFill} opacity={0.9} />
        <ellipse cx="75" cy="22" rx="60" ry="12" fill={cloudFill} opacity={0.9} />
      </g>

      {/* Distant morning birds */}
      <g stroke="#7C6898" strokeWidth="1.6" fill="none" opacity={0.45}>
        <path d="M420,110 Q426,104 432,110 Q438,104 444,110" />
        <path d="M448,96 Q453,91 458,96 Q463,91 468,96" />
        <path d="M472,115 Q476,111 480,115 Q484,111 488,115" />
      </g>

      {/* Morning sparkles */}
      <g fill={sparkleFill} opacity={0.7}>
        <polygon points="630,130 632,135 637,136 633,139 634,144 630,141 626,144 627,139 623,136 628,135" />
        <polygon points="980,110 981,114 985,115 982,117 983,121 980,119 977,121 978,117 975,115 979,114" />
      </g>
    </g>
  );
}

export interface AfternoonSkyProps {
  sunGlow: string;
  sunCore: string;
  cloudFill: string;
  cloudShadow: string;
  sparkleFill: string;
}

export function AfternoonSky({
  sunGlow,
  sunCore,
  cloudFill,
  cloudShadow,
  sparkleFill,
}: AfternoonSkyProps) {
  return (
    <g className="afternoon-sky" aria-hidden="true">
      {/* High bright afternoon sun upper right */}
      <g>
        <circle cx="1140" cy="95" r="62" fill={sunGlow} opacity={0.25} />
        <circle cx="1140" cy="95" r="42" fill={sunGlow} opacity={0.45} />
        <circle cx="1140" cy="95" r="28" fill={sunCore} />
      </g>

      {/* Billowy white afternoon clouds */}
      {/* Cloud 1: Left */}
      <g transform="translate(140 60)">
        <ellipse cx="65" cy="35" rx="70" ry="22" fill={cloudShadow} opacity={0.35} />
        <circle cx="45" cy="24" r="28" fill={cloudFill} />
        <circle cx="80" cy="20" r="32" fill={cloudFill} />
        <circle cx="110" cy="28" r="22" fill={cloudFill} />
        <ellipse cx="75" cy="32" rx="60" ry="16" fill={cloudFill} />
      </g>

      {/* Cloud 2: Center-left */}
      <g transform="translate(620 50)">
        <ellipse cx="55" cy="28" rx="60" ry="18" fill={cloudShadow} opacity={0.35} />
        <circle cx="40" cy="20" r="24" fill={cloudFill} />
        <circle cx="70" cy="18" r="26" fill={cloudFill} />
        <circle cx="95" cy="24" r="18" fill={cloudFill} />
        <ellipse cx="65" cy="26" rx="50" ry="14" fill={cloudFill} />
      </g>

      {/* Cloud 3: Floating around sun */}
      <g transform="translate(1080 85)">
        <ellipse cx="80" cy="30" rx="85" ry="18" fill={cloudShadow} opacity={0.25} />
        <circle cx="60" cy="22" r="22" fill={cloudFill} opacity={0.95} />
        <circle cx="95" cy="18" r="28" fill={cloudFill} opacity={0.95} />
        <circle cx="130" cy="24" r="20" fill={cloudFill} opacity={0.95} />
        <ellipse cx="90" cy="26" rx="70" ry="14" fill={cloudFill} opacity={0.95} />
      </g>

      {/* Afternoon sun sparkles */}
      <g fill={sparkleFill} opacity={0.65}>
        <polygon points="560,115 562,120 567,121 563,124 564,129 560,126 556,129 557,124 553,121 558,120" />
        <polygon points="920,85 921,89 925,90 922,92 923,96 920,94 917,96 918,92 915,90 919,89" />
        <circle cx="1230" cy="65" r="2.5" />
      </g>
    </g>
  );
}

export interface NightSkyProps {
  moonGlow: string;
  moonCore: string;
  cloudFill: string;
  cloudEdge: string;
  starColor: string;
}

export function NightSky({
  moonGlow,
  moonCore,
  cloudFill,
  cloudEdge,
  starColor,
}: NightSkyProps) {
  return (
    <g className="night-sky" aria-hidden="true">
      {/* 1. Twinkling Stars across upper sky */}
      <g fill={starColor}>
        {/* Large 4-point stars */}
        <path d="M140,55 Q143,62 150,64 Q143,66 140,73 Q137,66 130,64 Q137,62 140,55 Z" opacity={0.9} />
        <path d="M380,85 Q382,90 387,91 Q382,92 380,97 Q378,92 373,91 Q378,90 380,85 Z" opacity={0.8} />
        <path d="M620,40 Q622,46 628,47 Q622,48 620,54 Q618,48 612,47 Q618,46 620,40 Z" opacity={0.85} />
        <path d="M850,75 Q852,80 857,81 Q852,82 850,87 Q848,82 843,81 Q848,80 850,75 Z" opacity={0.8} />
        <path d="M1280,60 Q1282,66 1288,67 Q1282,68 1280,74 Q1278,68 1272,67 Q1278,66 1280,60 Z" opacity={0.85} />
        <path d="M1490,95 Q1492,99 1496,100 Q1492,101 1490,105 Q1488,101 1484,100 Q1488,99 1490,95 Z" opacity={0.75} />

        {/* Small pinprick star dots */}
        <circle cx="80" cy="90" r="1.8" opacity={0.7} />
        <circle cx="220" cy="45" r="2.2" opacity={0.8} />
        <circle cx="280" cy="110" r="1.5" opacity={0.6} />
        <circle cx="460" cy="65" r="2" opacity={0.75} />
        <circle cx="530" cy="120" r="1.6" opacity={0.65} />
        <circle cx="710" cy="80" r="2.2" opacity={0.8} />
        <circle cx="770" cy="35" r="1.5" opacity={0.6} />
        <circle cx="940" cy="100" r="2.2" opacity={0.85} />
        <circle cx="1020" cy="50" r="1.8" opacity={0.7} />
        <circle cx="1210" cy="120" r="2" opacity={0.8} />
        <circle cx="1340" cy="45" r="1.5" opacity={0.65} />
        <circle cx="1430" cy="80" r="2" opacity={0.8} />
        <circle cx="1540" cy="40" r="1.8" opacity={0.7} />
      </g>

      {/* 2. Crescent Moon upper right */}
      <g>
        {/* Soft moon ambient aura */}
        <circle cx="1115" cy="100" r="58" fill={moonGlow} opacity={0.18} />
        <circle cx="1115" cy="100" r="42" fill={moonGlow} opacity={0.3} />
        {/* Crisp Crescent Moon shape */}
        <path
          d="M1095,68 A38,38 0 1 0 1142,126 A32,32 0 1 1 1095,68 Z"
          fill={moonCore}
        />
        {/* Soft crater / star twinkle on the crescent tip */}
        <circle cx="1098" cy="74" r="1.5" fill="#FFF8E1" opacity={0.7} />
      </g>

      {/* 3. Deep violet stylized night clouds drifting under the moon */}
      {/* Cloud 1: Left */}
      <g transform="translate(120 70)">
        <ellipse cx="60" cy="28" rx="65" ry="18" fill={cloudEdge} opacity={0.5} />
        <circle cx="45" cy="20" r="22" fill={cloudFill} />
        <circle cx="75" cy="18" r="24" fill={cloudFill} />
        <circle cx="100" cy="24" r="16" fill={cloudFill} />
        <ellipse cx="65" cy="24" rx="55" ry="12" fill={cloudFill} />
      </g>

      {/* Cloud 2: Below Moon */}
      <g transform="translate(1040 120)">
        <ellipse cx="75" cy="26" rx="80" ry="18" fill={cloudEdge} opacity={0.5} />
        <circle cx="55" cy="18" r="22" fill={cloudFill} />
        <circle cx="90" cy="16" r="26" fill={cloudFill} />
        <circle cx="120" cy="22" r="18" fill={cloudFill} />
        <ellipse cx="85" cy="22" rx="65" ry="13" fill={cloudFill} />
      </g>
    </g>
  );
}

