import React from "react";

export interface SceneCottageProps {
  roofFill: string;
  roofShingles: string;
  wallFill: string;
  wallShade: string;
  trimFill: string;
  doorFill: string;
  awningFill: string;
  windowState: "unlit" | "soft" | "glowing";
  chimneyFill: string;
  smokeFill: string;
  treeFillFar: string;
  treeFillNear: string;
}

export function SceneCottage({
  roofFill,
  roofShingles,
  wallFill,
  wallShade,
  trimFill,
  doorFill,
  awningFill,
  windowState,
  chimneyFill,
  smokeFill,
  treeFillFar,
  treeFillNear,
}: SceneCottageProps) {
  // Window light styling
  const windowFill =
    windowState === "glowing"
      ? "#FFD54F"
      : windowState === "soft"
      ? "#FFE8A3"
      : "#EBF0FA";

  const windowGlow = windowState === "glowing";

  return (
    <g className="scene-cottage" aria-hidden="true">
      {/* Background trees behind the cottage */}
      <circle cx="1025" cy="340" r="32" fill={treeFillFar} />
      <circle cx="1042" cy="325" r="24" fill={treeFillNear} />
      <circle cx="1185" cy="345" r="30" fill={treeFillFar} />
      <circle cx="1170" cy="330" r="22" fill={treeFillNear} />

      {/* Chimney & Smoke */}
      <g>
        <rect x="1144" y="248" width="18" height="42" rx="3" fill={chimneyFill} />
        <rect x="1141" y="245" width="24" height="6" rx="2" fill={roofShingles} />
        {/* Whimsical drifting smoke puffs */}
        <circle cx="1153" cy="235" r="7" fill={smokeFill} opacity={0.7} />
        <circle cx="1146" cy="216" r="10" fill={smokeFill} opacity={0.55} />
        <circle cx="1134" cy="194" r="14" fill={smokeFill} opacity={0.4} />
      </g>

      {/* Cottage Walls */}
      <rect x="1046" y="322" width="118" height="74" rx="4" fill={wallFill} />
      <rect x="1046" y="386" width="118" height="10" rx="2" fill={wallShade} opacity={0.6} />

      {/* Main Pitched Roof */}
      <polygon
        points="1025,326 1105,248 1185,326"
        fill={roofFill}
      />
      {/* Roof fascia board */}
      <polygon
        points="1020,328 1105,245 1190,328 1184,334 1105,255 1026,334"
        fill={roofShingles}
      />

      {/* Roof Shingle details (scalloped rows) */}
      <g stroke={roofShingles} strokeWidth="1.5" fill="none" opacity={0.75}>
        <path d="M1065,302 Q1075,307 1085,302 Q1095,307 1105,302 Q1115,307 1125,302 Q1135,307 1145,302" />
        <path d="M1075,284 Q1085,289 1095,284 Q1105,289 1115,284 Q1125,289 1135,284" />
        <path d="M1088,266 Q1098,271 1105,266 Q1112,271 1122,266" />
      </g>

      {/* Attic Round Window */}
      <g>
        <circle cx="1105" cy="286" r="11" fill={trimFill} />
        <circle cx="1105" cy="286" r="8.5" fill={windowFill} />
        {windowGlow && (
          <circle cx="1105" cy="286" r="13" fill="#FFE082" opacity={0.35} filter="blur(2px)" />
        )}
        <line x1="1105" y1="277.5" x2="1105" y2="294.5" stroke={trimFill} strokeWidth="1.5" />
        <line x1="1096.5" y1="286" x2="1113.5" y2="286" stroke={trimFill} strokeWidth="1.5" />
      </g>

      {/* Ground Light Pool for Evening / Night */}
      {windowGlow && (
        <ellipse
          cx="1095"
          cy="402"
          rx="55"
          ry="14"
          fill="#FFE082"
          opacity={0.3}
        />
      )}

      {/* Front Door with Canopy */}
      <g>
        <rect x="1088" y="344" width="22" height="52" rx="3" fill={doorFill} />
        <circle cx="1104" cy="372" r="2" fill="#F7CA50" />
        {/* Canopy awning */}
        <path
          d="M1082,344 Q1099,338 1116,344 L1114,350 Q1099,345 1084,350 Z"
          fill={awningFill}
        />
      </g>

      {/* Ground Floor Windows (Left and Right) */}
      {/* Left window */}
      <g>
        <rect x="1058" y="342" width="22" height="26" rx="4" fill={trimFill} />
        <rect x="1060" y="344" width="18" height="22" rx="3" fill={windowFill} />
        {windowGlow && (
          <rect x="1056" y="340" width="26" height="30" rx="5" fill="#FFE082" opacity={0.3} />
        )}
        <line x1="1069" y1="344" x2="1069" y2="366" stroke={trimFill} strokeWidth="1.2" />
        <line x1="1060" y1="355" x2="1078" y2="355" stroke={trimFill} strokeWidth="1.2" />
        {/* Window flower box */}
        <rect x="1056" y="367" width="26" height="5" rx="1.5" fill={trimFill} />
        <circle cx="1061" cy="366" r="2.5" fill="#FF8A80" />
        <circle cx="1068" cy="365" r="2.5" fill="#FFD54F" />
        <circle cx="1075" cy="366" r="2.5" fill="#80D8FF" />
      </g>

      {/* Right window */}
      <g>
        <rect x="1122" y="342" width="22" height="26" rx="4" fill={trimFill} />
        <rect x="1124" y="344" width="18" height="22" rx="3" fill={windowFill} />
        {windowGlow && (
          <rect x="1120" y="340" width="26" height="30" rx="5" fill="#FFE082" opacity={0.3} />
        )}
        <line x1="1133" y1="344" x2="1133" y2="366" stroke={trimFill} strokeWidth="1.2" />
        <line x1="1124" y1="355" x2="1142" y2="355" stroke={trimFill} strokeWidth="1.2" />
        {/* Window flower box */}
        <rect x="1120" y="367" width="26" height="5" rx="1.5" fill={trimFill} />
        <circle cx="1125" cy="366" r="2.5" fill="#FFD54F" />
        <circle cx="1132" cy="365" r="2.5" fill="#FF8A80" />
        <circle cx="1139" cy="366" r="2.5" fill="#B388FF" />
      </g>
    </g>
  );
}
