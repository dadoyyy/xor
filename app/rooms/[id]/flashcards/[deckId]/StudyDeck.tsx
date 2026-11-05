"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Mascot from "@/components/Mascot";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";

type Card = { id: string; front: string; back: string };

export default function StudyDeck({ cards: initial }: { cards: Card[] }) {
  const [order, setOrder] = useState(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [onlyLearning, setOnlyLearning] = useState(false);

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
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function mark(isKnown: boolean) {
    if (!card) return;
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

  function restart(learningOnly: boolean) {
    setOnlyLearning(learningOnly);
    setI(0);
    setFlipped(false);
  }

  const learningLeft = order.filter((c) => !known.has(c.id)).length;

  const pct = deck.length ? (Math.min(i, deck.length) / deck.length) * 100 : 0;

  const panel = (
    <div className="card grid content-start gap-4 p-5">
      <div>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>
            Card {done ? deck.length : i + 1} of {deck.length}
          </span>
          {onlyLearning && <span className="text-ink-soft">Still learning</span>}
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-lilac">
          <div className="h-full rounded-full bg-grape transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sun-tint p-3 text-center">
          <p className="font-display text-2xl font-bold">{known.size}</p>
          <p className="text-xs font-bold text-ink-soft">Know</p>
        </div>
        <div className="rounded-2xl bg-grape-tint p-3 text-center">
          <p className="font-display text-2xl font-bold text-grape">{learningLeft}</p>
          <p className="text-xs font-bold text-ink-soft">Learning</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm flex-1" onClick={shuffle}>
          <Shuffle size={16} /> Shuffle
        </button>
        <button className="btn btn-sm flex-1" onClick={() => restart(false)}>
          <RotateCcw size={16} /> Restart
        </button>
      </div>
      <p className="hidden text-xs text-ink-soft lg:block">Space flips the card. Arrow keys move between cards.</p>
    </div>
  );

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {done || !card ? (
          <div className="card flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center lg:min-h-[28rem]">
            <Mascot size={96} mood="party" className="pop" />
            <p className="mt-4 font-display text-2xl font-semibold">Deck finished!</p>
            <p className="text-ink-soft">
              You know {known.size} of {order.length} cards.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {learningLeft > 0 && (
                <button className="btn btn-primary" onClick={() => restart(true)}>
                  Study the {learningLeft} I&apos;m learning
                </button>
              )}
              <button className="btn" onClick={() => restart(false)}>
                <RotateCcw size={16} /> Start over
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              className="flip block h-80 w-full text-left sm:h-96 lg:h-[28rem]"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "Show question" : "Show answer"}
            >
              <div className={`flip-inner h-full ${flipped ? "flipped" : ""}`}>
                <div className="flip-face card flex flex-col p-6 sm:p-8">
                  <span className="chip self-start border-grape/30 bg-grape-tint text-grape">Question</span>
                  <p className="m-auto max-h-full max-w-3xl overflow-y-auto text-center font-display text-2xl font-semibold leading-snug sm:text-3xl">
                    {card.front}
                  </p>
                  <span className="self-center text-xs font-bold text-ink-soft">Tap to flip</span>
                </div>
                <div className="flip-face flip-back card flex flex-col border-sun bg-sun-tint p-6 sm:p-8">
                  <span className="chip self-start border-sun bg-white">Answer</span>
                  <p className="m-auto max-h-full max-w-3xl overflow-y-auto text-center text-lg font-semibold leading-relaxed sm:text-xl">
                    {card.back}
                  </p>
                </div>
              </div>
            </button>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn" onClick={() => mark(false)}>
                Still learning
              </button>
              <button className="btn btn-sun" onClick={() => mark(true)}>
                I know this
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button className="btn btn-ghost btn-sm" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous card">
                <ChevronLeft size={18} /> Back
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => go(1)} aria-label="Next card">
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
