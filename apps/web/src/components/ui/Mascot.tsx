import Image from "next/image";
import { CORGI_ASSETS, type CorgiAssetKey } from "@/lib/mascot/assets";

export type Mood =
  | "happy"
  | "think"
  | "thinking"
  | "party"
  | "excited"
  | "cheering"
  | "sleepy"
  | "confused"
  | "sad"
  | "proud"
  | "winking"
  | "welcome"
  | "upload-pdf"
  | "flashcards"
  | "quiz-time"
  | "empty-state"
  | "error-loading"
  | "first-room"
  | "streak-7"
  | "perfect-score"
  | "leaderboard-1st"
  | "flashcard-master"
  | "joined-room"
  | "hero"
  | "hero-squad"
  | "standing";

export type MascotName = CorgiAssetKey | Mood;
export type MascotSurface =
  | "lilac"
  | "neutral"
  | "cream"
  | "yellow"
  | "white"
  | "white-alt"
  | "gradient";
export type MascotSize = "sm" | "md" | "lg" | number;
export type MascotShape = "circle" | "blob";

const SURFACE_TOKENS: Record<MascotSurface, string> = {
  lilac: "var(--mascot-bg-on-lilac)",
  neutral: "var(--mascot-bg-on-neutral)",
  cream: "var(--mascot-bg-on-cream)",
  yellow: "var(--mascot-bg-on-yellow)",
  white: "var(--mascot-bg-on-white)",
  "white-alt": "var(--mascot-bg-on-white-alt)",
  gradient: "var(--mascot-bg-on-gradient)",
};

const SIZE_PRESETS: Record<string, { imageSize: number; backdropSize: number }> = {
  sm: { imageSize: 46, backdropSize: 62 },
  md: { imageSize: 64, backdropSize: 86 },
  lg: { imageSize: 84, backdropSize: 114 },
};

function resolveDimensions(sizeProp?: MascotSize | string | number | null): {
  imageSize: number;
  backdropSize: number;
} {
  if (typeof sizeProp === "number" && !isNaN(sizeProp) && sizeProp > 0) {
    return {
      imageSize: Math.round(sizeProp),
      backdropSize: Math.round(sizeProp * 1.35),
    };
  }

  if (typeof sizeProp === "string") {
    const parsed = Number(sizeProp);
    if (!isNaN(parsed) && parsed > 0) {
      return {
        imageSize: Math.round(parsed),
        backdropSize: Math.round(parsed * 1.35),
      };
    }

    if (sizeProp in SIZE_PRESETS) {
      return SIZE_PRESETS[sizeProp];
    }
  }

  return SIZE_PRESETS.md;
}

function resolveMoodKey(nameOrMood?: MascotName | string | null): CorgiAssetKey {
  if (!nameOrMood) return "happy";
  if (nameOrMood === "think") return "thinking";
  if (nameOrMood === "party") return "cheering";
  if (nameOrMood === "hero") return "hero-squad";
  if (nameOrMood in CORGI_ASSETS) return nameOrMood as CorgiAssetKey;
  return "happy";
}

export interface MascotProps {
  name?: MascotName;
  mood?: MascotName; // backwards compatibility
  size?: MascotSize;
  surface?: MascotSurface | string;
  shape?: MascotShape;
  className?: string;
  imageClassName?: string;
  alt?: string;
  priority?: boolean;
  withBackdrop?: boolean;
}

export default function Mascot({
  name,
  mood = "happy",
  size = "md",
  surface,
  shape = "circle",
  className = "",
  imageClassName = "",
  alt,
  priority = false,
  withBackdrop = true,
}: MascotProps) {
  const chosenName = name ?? mood;
  const assetKey = resolveMoodKey(chosenName);
  const asset = CORGI_ASSETS[assetKey] ?? CORGI_ASSETS.happy;

  // Resolve sizes with absolute numeric guarantees
  const { imageSize, backdropSize } = resolveDimensions(size);

  // Resolve surface color
  let backdropBg = "var(--current-mascot-bg, var(--mascot-bg-on-white))";
  if (surface) {
    if (surface in SURFACE_TOKENS) {
      backdropBg = SURFACE_TOKENS[surface as MascotSurface];
    } else {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.warn(`[Mascot] Unmapped surface "${surface}", falling back to --mascot-bg-on-white`);
      }
      backdropBg = "var(--mascot-bg-on-white)";
    }
  }

  const shapeClass =
    shape === "blob"
      ? "rounded-[40%_60%_70%_30%/40%_50%_60%_50%]"
      : "rounded-full";

  const imageNode = (
    <Image
      src={asset.src}
      alt={alt ?? (alt === "" ? "" : asset.alt)}
      width={imageSize}
      height={imageSize}
      sizes={`${imageSize}px`}
      priority={priority}
      unoptimized
      draggable={false}
      aria-hidden={alt === "" ? true : undefined}
      className={`select-none object-contain translate-y-[2px] transition-transform duration-150 motion-reduce:animate-none ${imageClassName}`}
    />
  );

  if (!withBackdrop) {
    return (
      <span className={`inline-flex shrink-0 select-none items-center justify-center ${className}`}>
        {imageNode}
      </span>
    );
  }

  return (
    <div
      data-mascot-backdrop="true"
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center aspect-square shadow-none border-none transition-colors duration-150 ${shapeClass} ${className}`}
      style={{
        width: `${backdropSize}px`,
        height: `${backdropSize}px`,
        backgroundColor: backdropBg,
      }}
    >
      {imageNode}
    </div>
  );
}

export function Logo({
  size = 38,
  variant = "inline",
  priority = false,
}: {
  size?: number;
  variant?: "inline" | "stacked" | "icon";
  priority?: boolean;
}) {
  if (variant === "stacked") {
    const meta = CORGI_ASSETS["logo-stacked"];
    return (
      <Image
        src={meta.src}
        alt={meta.alt}
        width={Math.round(size * 2.2)}
        height={Math.round(size * 2.5)}
        sizes={`${Math.round(size * 2.2)}px`}
        priority={priority}
        unoptimized
        draggable={false}
        className="inline-block shrink-0 select-none object-contain motion-reduce:animate-none"
      />
    );
  }
  if (variant === "icon") {
    const meta = CORGI_ASSETS["logo-icon"];
    return (
      <Image
        src={meta.src}
        alt={meta.alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={priority}
        unoptimized
        draggable={false}
        className="inline-block shrink-0 select-none rounded-xl object-contain motion-reduce:animate-none"
      />
    );
  }

  const meta = CORGI_ASSETS["logo-main"];
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={meta.src}
        alt={meta.alt}
        width={Math.round(size * 1.15)}
        height={size}
        sizes={`${Math.round(size * 1.15)}px`}
        priority={priority}
        unoptimized
        draggable={false}
        className="inline-block shrink-0 select-none object-contain motion-reduce:animate-none"
      />
      <span className="font-display text-2xl font-bold leading-none tracking-tight text-ink">
        xor
      </span>
    </span>
  );
}
