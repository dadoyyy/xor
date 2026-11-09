import Mascot from "@/components/ui/Mascot";

// Hand-drawn study doodles that sit in the quiz stage's side margins.
const O = "#3a2d6e"; // outline

function Book({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      <path d="M70 26 C52 14 26 12 8 18 V92 C26 86 52 88 70 100 Z" fill="#fff" stroke={O} strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 26 C88 14 114 12 132 18 V92 C114 86 88 88 70 100 Z" fill="#efe7ff" stroke={O} strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 26 V100" stroke={O} strokeWidth="4" />
      {[36, 50, 64].map((y) => (
        <path key={y} d={`M20 ${y} C34 ${y - 4} 48 ${y - 3} 60 ${y + 2}`} stroke="#c9b8f5" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      {[36, 50].map((y) => (
        <path key={y} d={`M80 ${y + 2} C92 ${y - 3} 106 ${y - 4} 120 ${y}`} stroke="#b89bf5" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
      <path d="M100 14 V44 L108 37 L116 44 V12" fill="#ffcc33" stroke={O} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function Pencil({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 60" className={className} aria-hidden>
      <g transform="rotate(-18 75 30)">
        <rect x="22" y="18" width="92" height="24" rx="4" fill="#ffcc33" stroke={O} strokeWidth="4" />
        <path d="M22 30 H114" stroke="#e0a800" strokeWidth="3" />
        <rect x="8" y="18" width="18" height="24" rx="5" fill="#ff9bb8" stroke={O} strokeWidth="4" />
        <path d="M114 18 L142 30 L114 42 Z" fill="#ffe7b8" stroke={O} strokeWidth="4" strokeLinejoin="round" />
        <path d="M134 26.5 L142 30 L134 33.5 Z" fill={O} />
      </g>
    </svg>
  );
}

function Bulb({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 130" className={className} aria-hidden>
      {[
        [55, 6, 55, 18],
        [12, 30, 22, 38],
        [98, 30, 88, 38],
      ].map(([a, b, c, d], k) => (
        <path key={k} d={`M${a} ${b} L${c} ${d}`} stroke="#ffcc33" strokeWidth="6" strokeLinecap="round" />
      ))}
      <path d="M55 26 C32 26 20 44 22 62 C24 76 36 82 38 96 H72 C74 82 86 76 88 62 C90 44 78 26 55 26 Z" fill="#fff5d1" stroke={O} strokeWidth="4" />
      <path d="M46 70 L55 80 L64 70" stroke="#e0a800" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="96" width="34" height="12" rx="4" fill="#c9b8f5" stroke={O} strokeWidth="4" />
      <rect x="42" y="108" width="26" height="10" rx="4" fill="#7c3aed" stroke={O} strokeWidth="4" />
    </svg>
  );
}

function Cards({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <rect x="30" y="18" width="96" height="70" rx="10" fill="#efe7ff" stroke={O} strokeWidth="4" transform="rotate(12 78 53)" />
      <rect x="18" y="26" width="96" height="70" rx="10" fill="#fff" stroke={O} strokeWidth="4" transform="rotate(-6 66 61)" />
      <text x="44" y="78" fontFamily="Fredoka Variable, ui-rounded, sans-serif" fontWeight="700" fontSize="34" fill="#7c3aed" transform="rotate(-6 66 61)">
        A+
      </text>
      <path d="M112 30 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill="#ffcc33" stroke={O} strokeWidth="3" strokeLinejoin="round" transform="rotate(-6 66 61)" />
    </svg>
  );
}

function Stack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 70" className={className} aria-hidden>
      <rect x="10" y="38" width="130" height="24" rx="6" fill="#7c3aed" stroke={O} strokeWidth="4" />
      <path d="M22 50 H128" stroke="#c9b8f5" strokeWidth="3" />
      <rect x="22" y="14" width="110" height="24" rx="6" fill="#ffcc33" stroke={O} strokeWidth="4" />
      <path d="M34 26 H120" stroke="#fff5d1" strokeWidth="3" />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#ffcc33" stroke={O} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Decorations for the quiz stage. Only shown where the side margins are wide enough. */
export default function QuizDoodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden @[66rem]:block">
      <Book className="absolute left-[3%] top-[12%] w-32 -rotate-6 @[80rem]:w-40" />
      <Pencil className="absolute left-[2%] top-[48%] w-36 @[80rem]:w-44" />
      <Bulb className="absolute bottom-[8%] left-[6%] w-24 rotate-6 @[80rem]:w-28" />
      <Sparkle className="absolute left-[18%] top-[30%] w-7" />
      <Cards className="absolute right-[3%] top-[10%] w-36 @[80rem]:w-44" />
      <Sparkle className="absolute right-[17%] top-[44%] w-6" />
      <div className="absolute bottom-[6%] right-[4%] flex w-40 flex-col items-center @[80rem]:w-48">
        <Mascot size={96} mood="think" className="-mb-3" />
        <Stack className="w-full" />
      </div>
    </div>
  );
}

