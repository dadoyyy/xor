"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/layout/NavProgress";
import MaterialPicker, { ChipGroup, type PickableMaterial } from "@/components/ui/MaterialPicker";
import CorgiLoader from "@/components/mascot/CorgiLoader";
import InstructionsField from "@/components/ui/InstructionsField";
import { createFlashcardDeck } from "../services/flashcardService";
import type { DeckDifficulty } from "../types";

export default function NewDeckForm({ roomId, materials }: { roomId: string; materials: PickableMaterial[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(materials.slice(0, 1).map((m) => m.id));
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState<DeckDifficulty>("medium");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobStage, setJobStage] = useState<"reading" | "flashcards">("reading");
  const [progress, setProgress] = useState(12);
  const [error, setError] = useState<string | null>(null);

  // Advance job stages (reading PDF -> generating flashcards) while busy
  useEffect(() => {
    if (!busy) {
      setJobStage("reading");
      setProgress(12);
      return;
    }

    const stageTimer = setTimeout(() => {
      setJobStage("flashcards");
    }, 3200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) return prev + 7;
        if (prev < 82) return prev + 4;
        if (prev < 94) return prev + 1;
        return prev;
      });
    }, 650);

    return () => {
      clearTimeout(stageTimer);
      clearInterval(progressInterval);
    };
  }, [busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setJobStage("reading");
    setProgress(12);
    setError(null);
    try {
      const body = await createFlashcardDeck(roomId, {
        materialIds: selected,
        count,
        difficulty,
        title: title || undefined,
        instructions: instructions.trim() || undefined,
      });
      setProgress(100);
      startNavProgress();
      router.push(`/subjects/${roomId}/flashcards/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (busy)
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 py-12 text-center">
        <CorgiLoader
          variant={jobStage}
          progress={progress}
          size={140}
        />
        <p className="mt-3 text-sm text-ink-soft">
          {jobStage === "reading"
            ? "Stage 1 of 2 · Reading selected PDF materials…"
            : `Stage 2 of 2 · Building ${count} flashcards (${difficulty})…`}{" "}
          Keep this page open.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6">
      <h2 className="text-2xl font-semibold">New flashcard deck</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card grid min-w-0 grid-cols-1 content-start gap-6 p-5 sm:p-6">
          <MaterialPicker materials={materials} selected={selected} onChange={setSelected} />
          <InstructionsField value={instructions} onChange={setInstructions} />
        </div>
        <div className="card grid min-w-0 grid-cols-1 content-start gap-6 p-5 sm:p-6">
          <div>
            <label className="label" htmlFor="count">
              Number of cards: <span className="text-grape">{count}</span>
            </label>
            <input id="count" type="range" min={5} max={50} step={5} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-[var(--grape)]" />
          </div>
          <ChipGroup
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { id: "easy", label: "Easy" },
              { id: "medium", label: "Medium" },
              { id: "hard", label: "Hard" },
            ]}
          />
          <div>
            <label className="label" htmlFor="title">
              Deck name <span className="font-semibold text-ink-soft">(optional)</span>
            </label>
            <input id="title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Named after the PDF if empty" />
          </div>
        </div>
      </div>
      {error && <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
      <button className="btn btn-sun justify-self-start text-lg" disabled={!selected.length}>
        Make flashcards
      </button>
    </form>
  );
}

