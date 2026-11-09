"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play } from "@/utils/sound";
import Mascot from "@/components/ui/Mascot";
import SwipeCard from "./SwipeCard";
import { useFeedback } from "@/components/ui/Feedback";
import { logDeckReview } from "../services/flashcardService";
import { emitStreakUpdate } from "@/components/layout/StreakBadge";
import type { FlashcardItem } from "../types";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";

export default function StudyDeck({ cards: initial, deckId }: { cards: FlashcardItem[]; deckId?: string }) {
  const [order, setOrder] = useState(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [round, setRound] = useState(0); // bumps on restart so the card resets even on card 1
  const reviewedCardIds = useRef<Set<string>>(new Set());
  const { toast } = useFeedback();

  const flushReviewProgress = useCallback(
    (force = false) => {
      if (!deckId) return;
      const cardIds = Array.from(reviewedCardIds.current);
      if (cardIds.length === 0 || (!force && cardIds.length < 5)) return;
      reviewedCardIds.current.clear();
      void logDeckReview(deckId, cardIds)
        .then((res) => {
          if (res) {
            emitStreakUpdate({
              currentStreak: res.currentStreak,
              longestStreak: res.longestStreak,
              todayQualified: res.todayQualified,
              timezone: res.timezone,
            });
          }
        })
        .catch(() => {});
    },
    [deckId],
  );

  const deck = useMemo(() => (onlyLearning ? order.filter((c) => !known.has(c.id)) : order), [order, known, onlyLearning]);
  const card = deck[i];
  const done = i >= deck.length;

  const go = useCallback(
    (d: number) => {
      setFlipped(false);
      setI((x) => Math.max(0, Math.min(deck.length, x + d)));
    },
    [deck.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        play("flip");
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        play("next");
        go(1);
      } else if (e.key === "ArrowLeft") {
        play("next");
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function mark(isKnown: boolean) {
    if (!card) return;
    play(isKnown ? "know" : "learning");
    reviewedCardIds.current.add(card.id);
    flushReviewProgress(false);
    setKnown((s) => {
      const n = new Set(s);
      if (isKnown) n.add(card.id);
      else n.delete(card.id);
      return n;
    });
    // when filtering "still learning", removing a known card shifts the list instead
    if (onlyLearning && isKnown) setFlipped(false);
    else go(1);
  }

  function shuffle() {
    const a = [...order];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    setOrder(a);
    setI(0);
    setFlipped(false);
  }

  /** Full restart: back to card 1, original order, and the Know / Learning counts cleared. */
  function restart() {
    flushReviewProgress(true);
    setOrder(initial);
    setKnown(new Set());
    setOnlyLearning(false);
    setI(0);
    setFlipped(false);
    setRound((r) => r + 1);
    toast({ kind: "info", title: "Deck restarted", body: "Counts cleared. Back to card 1." });
  }

  /** Go again with only the cards still being learned (keeps what you already know). */
  function studyLearning() {
    flushReviewProgress(true);
    setOnlyLearning(true);
    setI(0);
    setFlipped(false);
    setRound((r) => r + 1);
  }

  // little celebration when the deck is finished + flush any remaining reviewed cards
  const wasDone = useRef(false);
  useEffect(() => {
    if (done && !wasDone.current && deck.length > 0) {
      play("deckDone");
      flushReviewProgress(true);
    }
    wasDone.current = done;
  }, [done, deck.length, flushReviewProgress]);

  useEffect(() => {
    return () => {
      flushReviewProgress(true);
    };
  }, [flushReviewProgress]);

  const learningLeft = order.filter((c) => !known.has(c.id)).length;

  const pct = deck.length ? (Math.min(i, deck.length) / deck.length) * 100 : 0;

  const panel = (
    <div className="rounded-[20px] bg-[#F7F5FF] grid content-start gap-4 p-5 shadow-none select-none">
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-ink">
          <span>
            Card {done ? deck.length : i + 1} of {deck.length}
          </span>
          {onlyLearning && <span className="text-[#5223BD]">Still learning</span>}
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-[#5223BD] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[14px] bg-[#FFF1C2] p-3 text-center">
          <p className="font-display text-2xl font-extrabold text-ink">{known.size}</p>
          <p className="text-[11px] font-bold text-ink-soft">Know</p>
        </div>
        <div className="rounded-[14px] bg-[#EFE9FF] p-3 text-center">
          <p className="font-display text-2xl font-extrabold text-[#5223BD]">{learningLeft}</p>
          <p className="text-[11px] font-bold text-ink-soft">Learning</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary btn-sm flex-1 shadow-none text-xs" onClick={shuffle}>
          <Shuffle size={14} /> Shuffle
        </button>
        <button className="btn btn-secondary btn-sm flex-1 shadow-none text-xs" onClick={restart}>
          <RotateCcw size={14} /> Restart
        </button>
      </div>
      <p className="hidden text-[11px] text-ink-soft lg:block">Space flips card. Arrow keys navigate.</p>
    </div>
  );

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {done || !card ? (
          <div className="rounded-[20px] bg-[#F7F5FF] flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center shadow-none lg:min-h-[28rem] select-none">
            <Mascot size={80} mood="party" className="pop" />
            <p className="mt-4 font-display text-2xl font-extrabold text-ink">Deck finished!</p>
            <p className="text-sm text-ink-soft">
              You know {known.size} of {order.length} cards.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {learningLeft > 0 && (
                <button className="btn btn-primary btn-sm shadow-none" onClick={studyLearning}>
                  Study the {learningLeft} I&apos;m learning
                </button>
              )}
              <button className="btn btn-secondary btn-sm shadow-none" onClick={restart}>
                <RotateCcw size={15} /> Start over
              </button>
            </div>
          </div>
        ) : (
          <>
            <SwipeCard resetKey={`${card.id}-${i}-${round}`} onSwipe={(dir) => mark(dir === "right")} leftLabel="Still learning" rightLabel="I know this">
            <button
              className="flip block h-80 w-full text-left sm:h-96 lg:h-[28rem]"
              data-sfx="none"
              onClick={() => {
                play("flip");
                setFlipped((f) => !f);
              }}
              aria-label={flipped ? "Show question" : "Show answer"}
            >
              <div className={`flip-inner h-full ${flipped ? "flipped" : ""}`}>
                <div className="flip-face rounded-[20px] bg-[#F7F5FF] flex flex-col p-6 sm:p-8 shadow-none border-none">
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#5223BD] self-start shadow-none">
                    Question
                  </span>
                  <p className="m-auto max-h-full max-w-3xl overflow-y-auto text-center font-display text-xl sm:text-2xl font-bold leading-snug text-ink">
                    {card.front}
                  </p>
                  <span className="self-center text-xs font-bold text-ink-soft">Tap or Space to flip</span>
                </div>
                <div className="flip-face flip-back rounded-[20px] bg-[#FFF1C2] flex flex-col p-6 sm:p-8 shadow-none border-none">
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-ink self-start shadow-none">
                    Answer
                  </span>
                  <p className="m-auto max-h-full max-w-3xl overflow-y-auto text-center text-base sm:text-lg font-semibold leading-relaxed text-ink">
                    {card.back}
                  </p>
                </div>
              </div>
            </button>
            </SwipeCard>
            <p className="mt-3 text-center text-xs font-bold text-ink-soft">
              Swipe left for <span className="text-coral">Still learning</span>, right for <span className="text-mint">I know this</span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn btn-secondary shadow-none text-xs font-bold" data-sfx="none" onClick={() => mark(false)}>
                <ArrowLeft size={16} /> Still learning
              </button>
              <button className="btn btn-accent shadow-none text-xs font-bold" data-sfx="none" onClick={() => mark(true)}>
                I know this <ArrowRight size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button className="btn btn-ghost btn-sm shadow-none" data-sfx="none" onClick={() => { play("next"); go(-1); }} disabled={i === 0} aria-label="Previous card">
                <ChevronLeft size={18} /> Back
              </button>
              <button className="btn btn-ghost btn-sm shadow-none" data-sfx="none" onClick={() => { play("next"); go(1); }} aria-label="Next card">
                Skip <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
      <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">{panel}</aside>
    </div>
  );
}
