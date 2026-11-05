// Pip — xor's mascot: a round little bird that "soars".
type Mood = "happy" | "think" | "party" | "sleepy";

export default function Mascot({
  size = 64,
  mood = "happy",
  className = "",
}: {
  size?: number;
  mood?: Mood;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Pip the xor bird"
    >
      {/* wing back */}
      <path
        d="M22 64 C6 52 8 34 20 30 C28 40 34 50 36 62 Z"
        fill="#5b2bd1"
        stroke="#3a2d6e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* body */}
      <ellipse cx="62" cy="68" rx="40" ry="38" fill="#7b3ff2" stroke="#3a2d6e" strokeWidth="4" />
      {/* belly */}
      <ellipse cx="66" cy="80" rx="24" ry="20" fill="#ece3ff" />
      {/* tuft */}
      <path
        d="M58 31 C56 20 62 14 68 16 C66 22 70 26 74 30"
        fill="none"
        stroke="#3a2d6e"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* eyes */}
      {mood === "sleepy" ? (
        <>
          <path d="M46 60 q6 5 12 0" stroke="#3a2d6e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M72 60 q6 5 12 0" stroke="#3a2d6e" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "party" ? (
        <>
          <path d="M46 62 q6 -7 12 0" stroke="#3a2d6e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M72 62 q6 -7 12 0" stroke="#3a2d6e" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="52" cy="60" r="7" fill="#3a2d6e" />
          <circle cx="78" cy="60" r="7" fill="#3a2d6e" />
          <circle cx="54.5" cy="57.5" r="2.4" fill="#fff" />
          <circle cx="80.5" cy="57.5" r="2.4" fill="#fff" />
        </>
      )}
      {/* cheeks */}
      <ellipse cx="42" cy="72" rx="6" ry="4" fill="#ff5d8f" opacity="0.75" />
      <ellipse cx="89" cy="72" rx="6" ry="4" fill="#ff5d8f" opacity="0.75" />
      {/* beak */}
      <path
        d="M58 68 L72 68 L65 77 Z"
        fill="#ffc83d"
        stroke="#3a2d6e"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* front wing */}
      <path
        d="M92 70 C108 62 114 46 106 40 C98 48 90 56 86 66 Z"
        fill="#5b2bd1"
        stroke="#3a2d6e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {mood === "think" && (
        <g>
          <circle cx="104" cy="22" r="5" fill="#ffc83d" stroke="#3a2d6e" strokeWidth="3" />
          <circle cx="94" cy="32" r="3" fill="#ffc83d" stroke="#3a2d6e" strokeWidth="2.5" />
        </g>
      )}
      {mood === "party" && (
        <g stroke="#3a2d6e" strokeWidth="3" strokeLinejoin="round">
          <path d="M50 30 L62 6 L74 30 Z" fill="#ffc83d" />
          <circle cx="62" cy="6" r="4" fill="#ff5d8f" />
          <rect x="16" y="14" width="7" height="7" fill="#ffcc33" transform="rotate(20 19 17)" />
          <rect x="98" y="12" width="7" height="7" fill="#ff5d8f" transform="rotate(-15 101 15)" />
        </g>
      )}
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mascot size={size} />
      <span className="font-display text-2xl font-bold leading-none tracking-tight">xor</span>
    </span>
  );
}
