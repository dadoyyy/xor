"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CORGI_LOADER_FRAMES,
  CORGI_LOADER_MESSAGES,
  type CorgiLoaderVariant,
} from "@/lib/mascot/loader";

export interface CorgiLoaderProps {
  variant?: CorgiLoaderVariant;
  message?: string;
  progress?: number;
  size?: number;
  className?: string;
}

export default function CorgiLoader({
  variant = "default",
  message,
  progress: _progress,
  size = 128,
  className = "",
}: CorgiLoaderProps) {
  const frames = CORGI_LOADER_FRAMES[variant] ?? CORGI_LOADER_FRAMES.default;
  const fallbackMessages =
    CORGI_LOADER_MESSAGES[variant] ?? CORGI_LOADER_MESSAGES.default;

  const [frameIndex, setFrameIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Reset indices when variant changes
  useEffect(() => {
    setFrameIndex(0);
    setMsgIndex(0);
    setMsgVisible(true);
  }, [variant]);

  // Frame animation loop:
  // - "default": random blink every 3000-5000ms (180ms closed)
  // - other variants: loop 2-3 frames every 500ms
  useEffect(() => {
    if (reducedMotion || frames.length <= 1) {
      setFrameIndex(0);
      return;
    }

    if (variant === "default") {
      let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
      let reopenTimeout: ReturnType<typeof setTimeout> | null = null;
      let cancelled = false;

      const scheduleBlink = () => {
        const delay = 3000 + Math.floor(Math.random() * 2000);
        blinkTimeout = setTimeout(() => {
          if (cancelled) return;
          setFrameIndex(1);
          reopenTimeout = setTimeout(() => {
            if (cancelled) return;
            setFrameIndex(0);
            scheduleBlink();
          }, 180);
        }, delay);
      };

      scheduleBlink();
      return () => {
        cancelled = true;
        if (blinkTimeout) clearTimeout(blinkTimeout);
        if (reopenTimeout) clearTimeout(reopenTimeout);
      };
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 500);

    return () => clearInterval(interval);
  }, [variant, frames.length, reducedMotion]);

  // Rotate friendly messages every 2.5s when no explicit message prop is given
  useEffect(() => {
    if (message || reducedMotion || fallbackMessages.length <= 1) {
      setMsgVisible(true);
      return;
    }

    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setMsgVisible(false);
      fadeTimeout = setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % fallbackMessages.length);
        setMsgVisible(true);
      }, 180);
    }, 2500);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [message, fallbackMessages.length, reducedMotion]);

  const activeMessage =
    message ?? fallbackMessages[msgIndex % fallbackMessages.length];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center text-center ${className}`}
    >
      {/* Stacked mascot frames (hidden from screen readers, zero layout shift) */}
      <div
        aria-hidden="true"
        style={{ width: size, height: size }}
        className="relative shrink-0 select-none"
      >
        {frames.map((src, idx) => {
          const isCurrent =
            (reducedMotion ? 0 : frameIndex % frames.length) === idx;
          return (
            <Image
              key={src}
              src={src}
              alt=""
              width={size}
              height={size}
              sizes={`${size}px`}
              priority={idx === 0}
              draggable={false}
              className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                isCurrent ? "opacity-100" : "opacity-0"
              }`}
            />
          );
        })}
      </div>

      {/* Three bouncing dots underneath for the "default" variant */}
      {variant === "default" && (
        <div
          aria-hidden="true"
          className="mt-1.5 flex items-center justify-center gap-1.5"
        >
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              style={{ animationDelay: `${dot * 140}ms` }}
              className={`size-2 rounded-full ${
                dot === 1 ? "bg-sun-deep" : "bg-grape"
              } ${reducedMotion ? "" : "corgi-dot-bounce"}`}
            />
          ))}
        </div>
      )}

      {/* Accessible status message with polite live region */}
      <div
        role="status"
        aria-live="polite"
        className="mt-3 min-h-[1.75rem] max-w-xs px-2"
      >
        <p
          className={`font-display text-base font-bold text-ink transition-opacity duration-200 motion-reduce:transition-none sm:text-lg ${
            msgVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {activeMessage}
        </p>
      </div>
    </div>
  );
}

