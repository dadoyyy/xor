"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  getSignupCorgiSrc,
  SIGNUP_CORGI_ALT,
  SIGNUP_CORGI_FALLBACK,
  SIGNUP_CORGI_IMAGES,
  type SignupCorgiState,
} from "@/lib/mascot/signup";

export interface SignupCorgiProps {
  state?: SignupCorgiState;
  size?: number;
  className?: string;
  decorative?: boolean;
}

export default function SignupCorgi({
  state = "default",
  size = 180,
  className = "",
  decorative = false,
}: SignupCorgiProps) {
  const activeSrc = getSignupCorgiSrc(state);
  const activeAlt = SIGNUP_CORGI_ALT[state] ?? SIGNUP_CORGI_ALT.default;
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    setHopping(true);
    const timer = setTimeout(() => setHopping(false), 320);
    return () => clearTimeout(timer);
  }, [activeSrc]);

  return (
    <div
      style={{ width: size, height: size }}
      aria-hidden={decorative ? true : undefined}
      className={`corgi-float relative inline-block shrink-0 select-none ${className}`}
    >
      <div className={`relative size-full ${hopping ? "corgi-hop" : ""}`}>
        {SIGNUP_CORGI_IMAGES.map((src) => {
          const isActive = src === activeSrc;
          const isDefault = src === SIGNUP_CORGI_FALLBACK;
          return (
            <Image
              key={src}
              src={src}
              width={size}
              height={size}
              sizes={`${size}px`}
              priority={isDefault}
              loading="eager"
              draggable={false}
              alt={!decorative && isActive ? activeAlt : ""}
              aria-hidden={decorative || !isActive ? true : undefined}
              className={`corgi-layer pointer-events-none absolute inset-0 size-full object-contain transition-opacity duration-150 ease-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
