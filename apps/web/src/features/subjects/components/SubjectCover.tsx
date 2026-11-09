"use client";

import { useState } from "react";
import Image from "next/image";
import { getCover, hasCoverAsset, coverStyle } from "../covers";

export interface SubjectCoverProps {
  id?: string | null;
  cover?: string | null; // Alias for id for compatibility
  subjectId?: string;
  roomId?: string; // Alias for subjectId for compatibility
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  big?: boolean;
}

const SIZES = {
  sm: "(max-width: 640px) 100vw, 240px",
  md: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 360px",
  lg: "(max-width: 768px) 100vw, 960px",
};

/**
 * Reusable SubjectCover component:
 * Renders either a geometric pattern or an illustrated corgi cover.
 * Decorative element with alt="" and aria-hidden="true".
 */
export default function SubjectCover({
  id,
  cover,
  subjectId,
  roomId,
  size = "md",
  className = "",
}: SubjectCoverProps) {
  const chosenId = id ?? cover ?? null;
  const targetId = subjectId ?? roomId ?? "";
  const def = getCover(chosenId, targetId);
  const [imgError, setImgError] = useState(false);

  // 1. Generic Pattern Cover (Preserved Exactly)
  if (def.kind === "pattern") {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={coverStyle(def)}
        aria-hidden="true"
      />
    );
  }

  // 2. Illustrated Corgi Cover
  const assetAvailable = hasCoverAsset(def.id) && !imgError && def.src;

  return (
    <div
      className={`relative overflow-hidden bg-[#EFE9FF] select-none ${className}`}
      aria-hidden="true"
    >
      {assetAvailable ? (
        <Image
          src={def.src!}
          alt=""
          aria-hidden="true"
          fill
          sizes={SIZES[size]}
          className="object-cover object-center transition-opacity duration-200"
          loading={size === "lg" ? "eager" : "lazy"}
          onError={() => setImgError(true)}
          unoptimized
        />
      ) : (
        /* Clean Lilac Placeholder for missing source covers */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#EFE9FF] p-2 text-center select-none">
          <div className="flex size-7 items-center justify-center rounded-full bg-white/70 shadow-xs">
            <span className="font-display text-xs font-bold text-[#6D3BE8]">
              {def.label.charAt(0)}
            </span>
          </div>
          <span className="mt-1 truncate max-w-full px-2 text-[11px] font-bold text-[#5B5480]">
            {def.label}
          </span>
        </div>
      )}
    </div>
  );
}

