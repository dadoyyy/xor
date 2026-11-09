"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Crown,
  Edit3,
  Eye,
  KeyRound,
  Pin,
  Plus,
  Users,
} from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import Mascot from "@/components/ui/Mascot";
import RoomCover from "./RoomCover";
import RoomCardMenu from "./RoomCardMenu";
import CreateSubjectDialog from "./CreateSubjectDialog";
import JoinSubjectDialog from "./JoinSubjectDialog";
import LinkSpinner from "@/components/ui/LinkSpinner";
import type { RoomSummary } from "../types";

export type LibrarySubjectItem = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  role: "owner" | "editor" | "viewer";
  cover: string | null;
  pinned: boolean;
  memberCount: number;
  newCount: number;
  addedAt: string;
};

type LibraryTab = "all" | "mine" | "shared" | "pinned";

export default function LibraryClient({
  subjects: initialSubjects,
  meId,
  coversEnabled,
  initialSearch = "",
  initialTab = "all",
}: {
  subjects: LibrarySubjectItem[];
  meId: string;
  coversEnabled: boolean;
  initialSearch?: string;
  initialTab?: LibraryTab;
}) {
  const [subjects, setSubjects] = useState<LibrarySubjectItem[]>(initialSubjects);
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [search, setSearch] = useState(initialSearch);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    setSubjects(initialSubjects);
  }, [initialSubjects]);

  // Listen to live global search events from TopBar
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearch(customEvent.detail ?? "");
    };

    window.addEventListener("xor:global-search", handleGlobalSearch);
    return () => {
      window.removeEventListener("xor:global-search", handleGlobalSearch);
    };
  }, []);

  // Sync initial query from URL search parameters on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("search");
      if (q !== null) {
        setSearch(q);
      }
    }
  }, []);

  // Tab & live search filtering
  const filtered = subjects.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchDesc) return false;
    }
    if (activeTab === "mine") return s.role === "owner";
    if (activeTab === "shared") return s.role !== "owner";
    if (activeTab === "pinned") return s.pinned;
    return true;
  });

  const counts = {
    all: subjects.length,
    mine: subjects.filter((s) => s.role === "owner").length,
    shared: subjects.filter((s) => s.role !== "owner").length,
    pinned: subjects.filter((s) => s.pinned).length,
  };

  const tabs: { id: LibraryTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "mine", label: "Mine", count: counts.mine },
    { id: "shared", label: "Shared", count: counts.shared },
    { id: "pinned", label: "Pinned", count: counts.pinned },
  ];

  // Pick mascot & 1-line copy for compact empty states
  const emptyInfo = search.trim()
    ? {
        mascot: "confused" as const,
        text: `No subjects match "${search.trim()}".`,
        btn: "Clear Search",
        action: () => {
          setSearch("");
          window.dispatchEvent(new CustomEvent("xor:global-search", { detail: "" }));
          window.history.replaceState(null, "", "/subjects");
        },
      }
    : activeTab === "pinned"
      ? {
          mascot: "sleepy" as const,
          text: "No pinned subjects yet. Pin your key subjects to find them here.",
          btn: "View All Subjects",
          action: () => setActiveTab("all"),
        }
      : activeTab === "mine"
        ? {
            mascot: "thinking" as const,
            text: "You haven't created any subjects yet.",
            btn: "New Subject",
            action: () => setShowCreate(true),
          }
        : activeTab === "shared"
          ? {
              mascot: "welcome" as const,
              text: "No shared subjects yet. Enter a key from a classmate.",
              btn: "Join with a Key",
              action: () => setShowJoin(true),
            }
          : {
              mascot: "empty-state" as const,
              text: "No subjects in your library yet.",
              btn: "New Subject",
              action: () => setShowCreate(true),
            };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar: Title, Subtitle, and Wrapping Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Subjects
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            All your classes, subjects, and collaborative workspaces.
          </p>
        </div>

        {/* Action Buttons: 10px radius flat, wraps on phone with 44px min touch target */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="btn btn-secondary btn-sm min-h-[44px] px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            <KeyRound size={16} />
            <span>Join with a key</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn btn-primary btn-sm min-h-[44px] px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>New subject</span>
          </button>
        </div>
      </div>

      {/* 2. Controls: Horizontal Tabs (Scrolls horizontally on mobile with 44px touch target) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scroll-smooth no-scrollbar" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 font-display text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[#F1ECFF] text-grape"
                  : "text-ink-soft hover:bg-lilac hover:text-ink"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isActive ? "bg-grape/15 text-grape" : "bg-lilac text-ink-soft"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Subjects Card Grid: Single column on phone, multi-column on desktop */}
      {filtered.length === 0 ? (
        /* Compact Corgi Empty State */
        <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-8 text-center">
          <div className="shrink-0 mb-1">
            <Mascot name={emptyInfo.mascot} size="sm" />
          </div>
          <p className="mt-3 text-xs sm:text-sm font-semibold text-ink">
            {emptyInfo.text}
          </p>
          <button
            type="button"
            onClick={emptyInfo.action}
            className="btn btn-primary btn-sm min-h-[44px] mt-4 px-4"
          >
            {emptyInfo.btn}
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* First tile: New Subject Tile (when not searching) */}
          {!search.trim() && (activeTab === "all" || activeTab === "mine") && (
            <li className="h-full">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-line bg-paper/60 p-5 text-center transition-colors hover:border-grape/60 hover:bg-lilac/30 active:scale-[0.99] cursor-pointer"
              >
                <div className="grid size-12 place-items-center rounded-[10px] bg-grape-tint text-grape">
                  <Plus size={24} />
                </div>
                <h2 className="mt-3 font-display text-base font-bold text-ink">
                  New subject
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Create a collaborative workspace with flashcards and quizzes.
                </p>
                <span className="btn btn-primary btn-xs mt-3">
                  + Create
                </span>
              </button>
            </li>
          )}

          {/* Subject Cards */}
          {filtered.map((s) => {
            const roomSummary: RoomSummary = {
              id: s.id,
              name: s.name,
              description: s.description,
              owner_id: s.owner_id,
              role: s.role,
              cover: s.cover,
            };

            return (
              <li key={s.id} className="group relative h-full">
                <Link
                  href={`/subjects/${s.id}`}
                  className="card card-link flex h-full flex-col justify-between p-4 transition-transform active:scale-[0.99]"
                >
                  <div>
                    {/* Top Cover Banner */}
                    <div className="relative mb-3">
                      <RoomCover
                        cover={s.cover}
                        roomId={s.id}
                        name={s.name}
                        className="h-24 w-full rounded-[10px]"
                      />
                      {s.newCount > 0 && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-coral px-2 py-0.5 font-display text-xs font-bold text-white shadow-xs">
                          {s.newCount > 9 ? "9+" : s.newCount} new
                        </span>
                      )}
                    </div>

                    {/* Title with Pin icon next to name */}
                    <div className="flex items-center gap-1.5">
                      {s.pinned && (
                        <span title="Pinned subject" className="inline-flex shrink-0">
                          <Pin
                            size={14}
                            className="fill-grape text-grape rotate-45"
                          />
                        </span>
                      )}
                      <h2 className="font-display text-base font-bold leading-snug text-ink truncate">
                        {s.name}
                      </h2>
                      <LinkSpinner className="size-3.5 text-grape" />
                    </div>

                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-soft leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </div>

                  {/* Footer metadata: Role + Member count */}
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 font-bold ${
                        s.role === "owner"
                          ? "bg-grape-tint text-grape"
                          : s.role === "editor"
                            ? "bg-sun-tint text-ink"
                            : "bg-lilac text-ink-soft"
                      }`}
                    >
                      {s.role === "owner" ? (
                        <Crown size={12} />
                      ) : s.role === "editor" ? (
                        <Edit3 size={12} />
                      ) : (
                        <Eye size={12} />
                      )}
                      <span className="capitalize">{s.role}</span>
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-ink-soft">
                      <Users size={13} /> {s.memberCount}
                    </span>
                  </div>
                </Link>

                {/* "..." menu inside top-right of the card, hover on desktop, always on touch */}
                <div className="absolute right-2.5 top-2.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 sm:transition-opacity max-sm:opacity-100">
                  <RoomCardMenu room={roomSummary} meId={meId} coversEnabled={coversEnabled} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dialogs */}
      {showCreate && <CreateSubjectDialog onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinSubjectDialog onClose={() => setShowJoin(false)} />}
    </div>
  );
}
