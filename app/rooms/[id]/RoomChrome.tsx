"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";
import RoomTabs from "./RoomTabs";
import { ChevronLeft, Crown, PanelLeft, X } from "lucide-react";

const KEY = "xor-sidebar-open";
const SIDEBAR_W = "18rem";
const DRAWER_W = "min(19rem, 85vw)";

/**
 * Room frame with one sidebar for every screen size.
 * Desktop: the sidebar sits beside the content and can be collapsed.
 * Phones/tablets: the same sidebar slides in as a drawer.
 */
export default function RoomChrome({
  roomId,
  name,
  description,
  isOwner,
  username,
  children,
}: {
  roomId: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  username: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // remember the desktop choice on this browser
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "0") setDesktopOpen(false);
    } catch {}
  }, []);

  // close the phone drawer after navigating or with Escape
  useEffect(() => setDrawerOpen(false), [path]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function toggle() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopOpen((o) => {
        try {
          localStorage.setItem(KEY, o ? "0" : "1");
        } catch {}
        return !o;
      });
    } else {
      setDrawerOpen((o) => !o);
    }
  }

  const sidebarBody = (
    <div className="page-x flex flex-col gap-6 py-6">
      <div>
        <Link href="/rooms" className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-grape">
          <ChevronLeft size={16} /> All rooms
        </Link>
        <p className="mt-2 font-display text-2xl font-bold leading-tight" style={{ overflowWrap: "anywhere" }}>{name}</p>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        {isOwner && (
          <span className="chip mt-3 border-sun bg-sun-tint">
            <Crown size={14} /> You own this room
          </span>
        )}
      </div>
      <RoomTabs roomId={roomId} vertical />
    </div>
  );

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm"
      style={{ marginLeft: "-0.5rem", paddingLeft: "0.5rem", paddingRight: "0.5rem" }}
      aria-label="Toggle sidebar"
      aria-controls="room-sidebar room-drawer"
      aria-expanded={drawerOpen || desktopOpen}
    >
      <PanelLeft size={20} />
    </button>
  );

  return (
    <>
      <TopBar username={username} leading={toggleButton} />

      <div className="lg:flex" style={{ minHeight: "calc(100dvh - 4rem)" }}>
        {/* desktop sidebar (collapsible) */}
        <aside
          id="room-sidebar"
          aria-label="Room"
          className="hidden shrink-0 bg-lilac lg:block"
          style={{
            // "clip" (not "hidden") so the sticky inner panel pins to the window, not this box
            overflowX: "clip",
            width: desktopOpen ? SIDEBAR_W : 0,
            borderRight: desktopOpen ? "2px solid var(--line)" : "0 solid transparent",
            transition: "width 200ms ease",
          }}
        >
          <div
            className="sticky overflow-y-auto"
            style={{ top: "4rem", width: SIDEBAR_W, maxHeight: "calc(100dvh - 4rem)" }}
            inert={!desktopOpen}
          >
            {sidebarBody}
          </div>
        </aside>

        <main className="page-x min-w-0 flex-1 pb-24 pt-6">
          {/* room name shows here when the sidebar isn't visible */}
          <h1 className={`mb-4 truncate text-2xl font-bold ${desktopOpen ? "lg:hidden" : ""}`}>{name}</h1>
          {children}
        </main>
      </div>

      {/* phone + tablet drawer: same sidebar */}
      <div className={`fixed inset-0 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`} style={{ zIndex: 40 }} aria-hidden={!drawerOpen}>
        <div
          className="absolute inset-0"
          style={{ background: "rgba(43, 37, 69, 0.3)", opacity: drawerOpen ? 1 : 0, transition: "opacity 200ms ease" }}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          id="room-drawer"
          aria-label="Room"
          inert={!drawerOpen}
          className="absolute left-0 overflow-y-auto bg-lilac"
          style={{
            top: 0,
            bottom: 0,
            borderRight: "2px solid var(--line)",
            width: DRAWER_W,
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 200ms ease",
            boxShadow: "8px 0 30px -12px rgba(91, 33, 182, 0.25)",
          }}
        >
          <div className="page-x flex" style={{ justifyContent: "flex-end", paddingTop: "0.75rem" }}>
            <button className="btn btn-ghost btn-sm" style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem" }} onClick={() => setDrawerOpen(false)} aria-label="Close sidebar">
              <X size={20} />
            </button>
          </div>
          <div style={{ marginTop: "-1.5rem" }}>{sidebarBody}</div>
        </aside>
      </div>
    </>
  );
}
