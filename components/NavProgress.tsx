"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const NAV_START = "xor:nav-start";

/** Call before a programmatic navigation so the top bar starts right away. */
export function startNavProgress() {
  window.dispatchEvent(new Event(NAV_START));
}

/**
 * Thin purple→yellow bar at the very top. It starts the moment a link is
 * clicked (or startNavProgress() is called) and finishes when the new page
 * is on screen, so every click gets instant feedback.
 */
function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const start = () => {
      clear();
      setState("loading");
      timers.current.push(window.setTimeout(() => setState("idle"), 15000)); // never get stuck
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / hash
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_START, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_START, start);
      clear();
    };
  }, []);

  // the new page is here: finish the bar, then fade it out
  useEffect(() => {
    setState((s) => {
      if (s !== "loading") return s;
      clear();
      timers.current.push(window.setTimeout(() => setState("idle"), 350));
      return "done";
    });
  }, [path, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0"
      style={{ zIndex: 100, height: 3, opacity: state === "idle" ? 0 : 1, transition: "opacity 250ms ease 100ms" }}
    >
      <div
        key={state === "idle" ? "i" : "a"}
        className={state === "loading" ? "nav-bar-grow" : ""}
        style={{
          height: "100%",
          background: "linear-gradient(90deg, var(--grape), var(--sun))",
          borderRadius: "0 999px 999px 0",
          boxShadow: "0 0 8px rgba(124, 58, 237, 0.45)",
          width: state === "done" ? "100%" : state === "loading" ? undefined : "0%",
          transition: state === "done" ? "width 200ms ease" : undefined,
        }}
      />
    </div>
  );
}

export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
