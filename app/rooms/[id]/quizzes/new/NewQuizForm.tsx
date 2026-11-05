"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/NavProgress";
import MaterialPicker, { ChipGroup, type PickableMaterial } from "@/components/MaterialPicker";
import Mascot from "@/components/Mascot";
import { QUESTION_TYPES, type QType } from "@/lib/questions";
import { Check } from "lucide-react";
import InstructionsField from "@/components/InstructionsField";

type Diff = "easy" | "medium" | "hard" | "mixed";

export default function NewQuizForm({ roomId, materials }: { roomId: string; materials: PickableMaterial[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(materials.slice(0, 1).map((m) => m.id));
  const [types, setTypes] = useState<QType[]>(["multiple_choice", "true_false", "identification"]);
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState<Diff>("medium");
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(20);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (t: QType) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialIds: selected,
          types,
          count,
          difficulty,
          timeLimitMinutes: timed ? minutes : null,
          title: title || undefined,
          instructions: instructions.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't make the quiz.");
      startNavProgress();
      router.push(`/rooms/${roomId}/quizzes/${body.id}`);
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
        <p className="mt-4 font-display text-xl font-semibold">Writing {count} questions…</p>
        <p className="text-sm text-ink-soft">
          {count > 20 ? "Big quizzes are written in batches and can take 1–3 minutes." : "This usually takes under a minute."}{instructions.trim() ? " Your instructions are being applied first." : ""} Keep this page open.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">New quiz</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card grid content-start gap-6 p-5 sm:p-6">
          <MaterialPicker materials={materials} selected={selected} onChange={setSelected} />
          <div>
            <label className="label" htmlFor="count">
              Number of questions: <span className="text-grape">{count}</span>
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
              { id: "mixed", label: "Mixed" },
            ]}
          />
          <div>
            <label className="flex items-center gap-3 font-bold">
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="size-5 accent-[var(--grape)]" />
              Add a time limit
            </label>
            {timed && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  className="input w-24"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, Math.min(240, +e.target.value || 1)))}
                  aria-label="Minutes"
                />
                <span className="font-semibold text-ink-soft">minutes</span>
              </div>
            )}
          </div>
          <InstructionsField value={instructions} onChange={setInstructions} />
        </div>

        <div className="card grid content-start gap-6 p-5 sm:p-6">
          <fieldset>
            <legend className="label">Question types</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((t) => {
                const on = types.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleType(t.id)}
                    className={`card-flat flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? "border-sun bg-sun-tint" : "hover:bg-lilac"}`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 ${on ? "border-sun-deep bg-sun" : "border-line bg-white"}`}>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold leading-tight">{t.label}</span>
                      <span className="block text-xs text-ink-soft">{t.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="title">
              Quiz name <span className="font-semibold text-ink-soft">(optional)</span>
            </label>
            <input id="title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Named after the PDF if empty" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary text-lg" disabled={!selected.length || !types.length}>
          Make quiz
        </button>
        <span className="text-sm text-ink-soft">
          {count} questions · {types.length} type{types.length === 1 ? "" : "s"}
        </span>
      </div>
    </form>
  );
}
