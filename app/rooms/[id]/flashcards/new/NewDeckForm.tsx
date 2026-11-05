"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/NavProgress";
import MaterialPicker, { ChipGroup, type PickableMaterial } from "@/components/MaterialPicker";
import Mascot from "@/components/Mascot";
import InstructionsField from "@/components/InstructionsField";

type Diff = "easy" | "medium" | "hard";

export default function NewDeckForm({ roomId, materials }: { roomId: string; materials: PickableMaterial[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(materials.slice(0, 1).map((m) => m.id));
  const [count, setCount] = useState(20);
  const [difficulty, setDifficulty] = useState<Diff>("medium");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/decks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialIds: selected, count, difficulty, title: title || undefined, instructions: instructions.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't make the deck.");
      startNavProgress();
      router.push(`/rooms/${roomId}/flashcards/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (busy)
    return (
      <div className="card flex min-h-[50dvh] flex-col items-center justify-center px-6 py-12 text-center">
        <Mascot size={96} mood="think" className="bob" />
        <p className="mt-4 font-display text-xl font-semibold">Writing your flashcards…</p>
        <p className="text-sm text-ink-soft">
          {count > 20 ? "Big decks are made in batches and can take 1–2 minutes." : "This usually takes 10–40 seconds."} Keep this page open.
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
