"use client";
import { useEffect, useRef, useState } from "react";

type Dir = "left" | "right";

/**
 * Drag a card sideways: past the threshold it flies off and calls onSwipe.
 * A plain tap still reaches the card underneath (so tapping flips it),
 * and vertical drags still scroll the page.
 */
export default function SwipeCard({
  resetKey,
  onSwipe,
  leftLabel,
  rightLabel,
  children,
}: {
  resetKey: string;
  onSwipe: (dir: Dir) => void;
  leftLabel: string;
  rightLabel: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false);
  const [dx, setDx] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [leaving, setLeaving] = useState<Dir | null>(null);
  const [entering, setEntering] = useState(false);

  // next card: snap back to the middle without animating, then pop in
  useEffect(() => {
    setAnimate(false);
    setDx(0);
    setLeaving(null);
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 220);
    return () => clearTimeout(t);
  }, [resetKey]);

  const width = () => box.current?.offsetWidth ?? 320;
  const threshold = () => Math.min(120, width() * 0.28);

  function onPointerDown(e: React.PointerEvent) {
    if (leaving || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    dragging.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!dragging.current) {
      if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) {
        if (Math.abs(my) > 12) start.current = null; // they're scrolling
        return;
      }
      dragging.current = true;
      setAnimate(false);
      box.current?.setPointerCapture(e.pointerId);
    }
    setDx(mx);
  }

  function finish(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || !dragging.current) return;
    dragging.current = false;
    justDragged.current = true; // swallow the click that follows a drag
    setTimeout(() => (justDragged.current = false), 50);

    const mx = e.clientX - s.x;
    const speed = Math.abs(mx) / Math.max(1, performance.now() - s.t); // px per ms
    setAnimate(true);
    if (Math.abs(mx) > threshold() || (speed > 0.6 && Math.abs(mx) > 40)) {
      const dir: Dir = mx > 0 ? "right" : "left";
      setLeaving(dir);
      setDx((dir === "right" ? 1 : -1) * width() * 1.4);
      try {
        navigator.vibrate?.(12);
      } catch {}
      setTimeout(() => onSwipe(dir), 200);
    } else {
      setDx(0);
    }
  }

  const t = threshold();
  const rightAmt = Math.max(0, Math.min(1, dx / t));
  const leftAmt = Math.max(0, Math.min(1, -dx / t));

  return (
    <div
      ref={box}
      className="relative select-none"
      style={{
        touchAction: "pan-y",
        transform: `translateX(${dx}px) rotate(${dx / 22}deg)${entering ? " scale(0.97)" : ""}`,
        opacity: leaving ? 0 : entering ? 0.6 : 1,
        transition: animate
          ? "transform 220ms cubic-bezier(0.2, 0.8, 0.3, 1), opacity 220ms ease"
          : entering
            ? "none"
            : "transform 160ms ease, opacity 160ms ease",
        willChange: "transform",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={(e) => {
        if (justDragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}

      {/* labels that fade in while dragging */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px] border-4"
        style={{ borderColor: "var(--mint)", background: "rgba(22, 163, 74, 0.10)", opacity: rightAmt }}
      >
        <span
          className="absolute left-5 top-5 rounded-xl border-4 px-3 py-1 font-display text-lg font-bold uppercase sm:text-xl"
          style={{ borderColor: "var(--mint)", color: "var(--mint)", background: "#fff", transform: "rotate(-10deg)" }}
        >
          {rightLabel}
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px] border-4"
        style={{ borderColor: "var(--coral)", background: "rgba(229, 72, 77, 0.10)", opacity: leftAmt }}
      >
        <span
          className="absolute right-5 top-5 rounded-xl border-4 px-3 py-1 font-display text-lg font-bold uppercase sm:text-xl"
          style={{ borderColor: "var(--coral)", color: "var(--coral)", background: "#fff", transform: "rotate(10deg)" }}
        >
          {leftLabel}
        </span>
      </div>
    </div>
  );
}
