"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Dices, X } from "lucide-react";
import { useFeedback } from "@/components/ui/Feedback";
import {
  COVERS,
  CORGI_COVERS,
  PATTERN_COVERS,
  getCover,
  getRandomCover,
  hasCoverAsset,
  coverStyle,
  type CoverDefinition,
  type CoverCategory,
} from "../covers";
import SubjectCover from "./SubjectCover";
import { updateRoomInfo, setMyRoomCover } from "@/features/rooms/services/roomService";
import type { RoomSummary } from "@/features/rooms/types";

export interface EditSubjectModalProps {
  room: RoomSummary;
  coversEnabled?: boolean;
  onClose: () => void;
  onSuccess?: (updatedCover: string, name?: string, desc?: string) => void;
}

type TabType = "all" | "corgi" | "pattern";

export default function EditSubjectModal({
  room,
  coversEnabled = true,
  onClose,
  onSuccess,
}: EditSubjectModalProps) {
  const router = useRouter();
  const { confirm, toast } = useFeedback();

  const isOwner = room.role === "owner";
  const startCover = getCover(room.cover, room.id).id;

  const [name, setName] = useState(room.name);
  const [desc, setDesc] = useState(room.description ?? "");
  const [cover, setCover] = useState(startCover);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [busy, setBusy] = useState(false);

  const radioRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const hasChanges =
    cover !== startCover ||
    (isOwner && (name !== room.name || desc !== (room.description ?? "")));

  // Filter covers by category tab
  const displayedCovers: CoverDefinition[] =
    activeTab === "all"
      ? COVERS
      : activeTab === "corgi"
        ? CORGI_COVERS
        : PATTERN_COVERS;

  // Safe dismiss with unsaved changes confirmation
  const handleRequestClose = async () => {
    if (busy) return;
    if (hasChanges) {
      const ok = await confirm({
        title: "Discard unsaved changes?",
        body: "You have unsaved changes to this subject. Are you sure you want to discard them?",
        confirmLabel: "Discard changes",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  // Keyboard navigation: Escape to close, arrows in radiogroup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, hasChanges]);

  // Arrow key navigation across 3-column radiogroup
  const handleKeyDownRadiogroup = (
    e: React.KeyboardEvent,
    currentIndex: number
  ) => {
    const count = displayedCovers.length;
    let nextIndex = -1;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % count;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + count) % count;
    } else if (e.key === "ArrowDown") {
      nextIndex = currentIndex + 3 < count ? currentIndex + 3 : currentIndex;
    } else if (e.key === "ArrowUp") {
      nextIndex = currentIndex - 3 >= 0 ? currentIndex - 3 : currentIndex;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex !== -1 && nextIndex !== currentIndex) {
      e.preventDefault();
      const target = displayedCovers[nextIndex];
      setCover(target.id);
      radioRefs.current.get(target.id)?.focus();
    }
  };

  // Surprise me randomizer
  const handleSurpriseMe = () => {
    const random = getRandomCover(cover);
    setCover(random.id);
    // Switch to category if not visible in current tab
    if (activeTab === "corgi" && random.category !== "corgi") {
      setActiveTab("all");
    } else if (activeTab === "pattern" && random.category !== "pattern") {
      setActiveTab("all");
    }
    radioRefs.current.get(random.id)?.focus();
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      if (isOwner && (name !== room.name || desc !== (room.description ?? ""))) {
        await updateRoomInfo(room.id, name.trim(), desc.trim());
      }
      if (coversEnabled && cover !== startCover) {
        await setMyRoomCover(room.id, cover);
      }

      // Optimistic update callback
      onSuccess?.(cover, name, desc);

      toast({
        title: isOwner ? "Subject updated" : "Design saved",
        body:
          coversEnabled && cover !== startCover
            ? "Your card cover has been updated."
            : undefined,
      });

      onClose();
      router.refresh();
    } catch (err) {
      toast({
        kind: "error",
        title: "Couldn't save changes",
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 grid place-items-center overflow-y-auto p-0 sm:p-4"
      style={{ zIndex: 70 }}
    >
      {/* Backdrop */}
      <div
        className="fade-in fixed inset-0"
        style={{ background: "rgba(43, 37, 69, 0.40)" }}
        onClick={handleRequestClose}
        aria-hidden="true"
      />

      {/* Dialog Window: full-screen sheet on mobile, rounded card on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-subject-title"
        className="card pop relative z-10 flex h-full w-full flex-col bg-white p-4 sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[24px] sm:p-6"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line pb-3 sm:border-0 sm:pb-0">
          <div>
            <h2 id="edit-subject-title" className="font-display text-xl sm:text-2xl font-bold text-ink">
              {isOwner ? "Edit subject" : "Change design"}
            </h2>
            <p className="text-xs font-semibold text-ink-soft">
              {isOwner
                ? "Update subject details and customize your card cover."
                : "Customize how this subject appears in your library."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={busy}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-lilac focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-accent)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area: Two-column grid on desktop, stacked on mobile */}
        <div className="flex-1 overflow-y-auto py-4 sm:py-5">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            {/* Left Column: Live Card Preview + Text Fields */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Preview
              </span>

              {/* Live Subject Card Preview */}
              <div className="card-flat overflow-hidden rounded-[18px] border border-line bg-paper p-3 shadow-xs select-none">
                <SubjectCover
                  id={cover}
                  subjectId={room.id}
                  size="md"
                  className="h-28 w-full rounded-[12px]"
                />
                <h3 className="mt-3 truncate px-1 font-display text-lg font-bold text-ink">
                  {name.trim() || "Subject name"}
                </h3>
                <p className="mt-0.5 line-clamp-2 px-1 text-xs text-ink-soft">
                  {desc.trim() || "No description"}
                </p>
              </div>

              {/* Owner Edit Fields */}
              {isOwner && (
                <div className="flex flex-col gap-3.5 mt-1">
                  <div>
                    <label
                      className="block text-xs font-bold text-ink mb-1.5"
                      htmlFor="er-name"
                    >
                      Name
                    </label>
                    <input
                      id="er-name"
                      type="text"
                      className="input w-full rounded-full min-h-[44px] px-4"
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Biology 101"
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold text-ink mb-1.5"
                      htmlFor="er-desc"
                    >
                      Description{" "}
                      <span className="font-semibold text-ink-soft">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="er-desc"
                      type="text"
                      className="input w-full rounded-full min-h-[44px] px-4"
                      maxLength={280}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="What's this subject for?"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Card Design Picker */}
            <div className="flex flex-col">
              {/* Picker Title + Surprise Me Button */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-display text-base font-bold text-ink">
                    Card design
                  </span>
                  <p className="text-xs font-semibold text-ink-soft">
                    Just for you. Everyone in this subject picks their own.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="btn btn-ghost btn-sm rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 px-3 min-h-[36px]"
                  title="Pick a random cover"
                >
                  <Dices size={16} className="text-[var(--shell-accent)]" />
                  <span>Surprise me</span>
                </button>
              </div>

              {/* Pill-shaped Category Tabs */}
              <div
                role="tablist"
                aria-label="Cover categories"
                className="mt-3 flex items-center gap-1.5 border-b border-line pb-2.5"
              >
                {(
                  [
                    { id: "all", label: "All", count: COVERS.length },
                    { id: "corgi", label: "Corgi", count: CORGI_COVERS.length },
                    {
                      id: "pattern",
                      label: "Patterns",
                      count: PATTERN_COVERS.length,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-[34px] rounded-full px-3.5 py-1 text-xs font-bold transition-colors select-none flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-accent)] ${
                        isActive
                          ? "bg-[#6D3BE8] text-white"
                          : "bg-lilac text-ink-soft hover:bg-lilac/80 hover:text-ink"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white text-ink-soft"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grid of Thumbnails */}
              <div className="mt-3.5 max-h-[360px] md:max-h-[400px] overflow-y-auto pr-1">
                <div
                  role="radiogroup"
                  aria-label="Card design thumbnails"
                  className="grid grid-cols-3 gap-2.5"
                >
                  {displayedCovers.map((c, index) => {
                    const isSelected = c.id === cover;
                    const hasAsset = hasCoverAsset(c.id);

                    return (
                      <button
                        key={c.id}
                        ref={(el) => {
                          if (el) radioRefs.current.set(c.id, el);
                          else radioRefs.current.delete(c.id);
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={c.label}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setCover(c.id)}
                        onKeyDown={(e) => handleKeyDownRadiogroup(e, index)}
                        className={`group relative flex flex-col text-left select-none cursor-pointer focus-visible:outline-none rounded-[12px] p-1 transition-colors ${
                          isSelected
                            ? "bg-[#EFE9FF]"
                            : "hover:bg-lilac/40"
                        }`}
                      >
                        {/* Thumbnail Strip: 8:3 Aspect Ratio */}
                        <div
                          className={`relative aspect-[8/3] w-full overflow-hidden rounded-[8px] transition-all ${
                            isSelected
                              ? "ring-2 ring-[var(--shell-accent)] ring-offset-2"
                              : "hover:ring-2 hover:ring-[var(--sheet-border)]"
                          }`}
                          style={
                            c.kind === "pattern" ? coverStyle(c) : undefined
                          }
                        >
                          {/* Pattern or Image Thumbnail */}
                          {c.kind === "image" && (
                            hasAsset ? (
                              <Image
                                src={c.thumb!}
                                alt=""
                                aria-hidden="true"
                                fill
                                sizes="120px"
                                className="object-cover object-center"
                                loading="lazy"
                                unoptimized
                              />
                            ) : (
                              /* Placeholder for missing cover */
                              <div className="absolute inset-0 flex items-center justify-center bg-[#EFE9FF] text-center p-1">
                                <span className="truncate text-[10px] font-bold text-[#5B5480]">
                                  {c.label}
                                </span>
                              </div>
                            )
                          )}

                          {/* Selected Check Badge */}
                          {isSelected && (
                            <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[var(--shell-accent)] text-white shadow-xs">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        {/* Human Friendly Label */}
                        <span
                          className={`mt-1 truncate text-center text-[11px] font-semibold transition-colors ${
                            isSelected
                              ? "text-[var(--shell-accent)] font-bold"
                              : "text-ink-soft group-hover:text-ink"
                          }`}
                        >
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer: Cancel and Save Pill Buttons */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-line pt-3 sm:border-0 sm:pt-4">
          <button
            type="button"
            className="btn rounded-full min-h-[44px] px-6 text-sm font-semibold select-none cursor-pointer"
            onClick={handleRequestClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary rounded-full min-h-[44px] px-6 text-sm font-semibold select-none cursor-pointer"
            disabled={busy || (isOwner && !name.trim())}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            <span>
              {busy ? "Saving…" : isOwner ? "Save changes" : "Save design"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

