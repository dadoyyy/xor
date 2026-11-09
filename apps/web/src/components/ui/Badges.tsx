/** Red notification circle with a count (1–9, then 9+). Renders nothing at 0. */
export function CountBadge({ count, className = "", label }: { count: number; className?: string; label?: string }) {
  if (!count) return null;
  return (
    <span
      className={`pop inline-grid shrink-0 place-items-center rounded-full font-display text-[11px] font-bold leading-none text-white ${className}`}
      style={{ background: "var(--coral)", minWidth: "1.25rem", height: "1.25rem", padding: "0 0.3rem", boxShadow: "0 0 0 2px #fff" }}
      aria-label={label ?? `${count} new`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Small red dot (no number), e.g. on the sidebar button. */
export function DotBadge({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className={`pop absolute rounded-full ${className}`}
      style={{ background: "var(--coral)", width: "0.6rem", height: "0.6rem", boxShadow: "0 0 0 2px #fff" }}
    />
  );
}

/** "New" tag for items added since you last looked. */
export function NewTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-display text-[11px] font-bold text-white"
      style={{ background: "var(--coral)" }}
    >
      New
    </span>
  );
}

