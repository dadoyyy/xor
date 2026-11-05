"use client";
import { Sparkles } from "lucide-react";

const MAX = 600;
const EXAMPLES = ["Leave out the Tools section", "Only cover chapters 2 and 3", "Focus on definitions and key terms"];

/** "Tell the AI what to include or leave out" box with tap-to-add examples. */
export default function InstructionsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const add = (text: string) => {
    const next = value.trim() ? `${value.trim().replace(/[.]?$/, ".")} ${text}.` : `${text}.`;
    onChange(next.slice(0, MAX));
  };

  return (
    <div>
      <label className="label flex items-center gap-1.5" htmlFor="instructions">
        <Sparkles size={16} className="text-grape" /> Instructions for the AI <span className="font-semibold text-ink-soft">(optional)</span>
      </label>
      <textarea
        id="instructions"
        className="input min-h-28 leading-relaxed"
        maxLength={MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell the AI what to include or leave out, e.g. “Skip the Tools part and the history intro. Make the questions about real-life cases.”"
        aria-describedby="instructions-help"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip hover:bg-lilac" onClick={() => add(ex)}>
            + {ex}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-ink-soft">
          {value.length}/{MAX}
        </span>
      </div>
      <p id="instructions-help" className="mt-2 text-xs text-ink-soft">
        The AI checks your PDF&apos;s content first and only uses the parts you allow. You can also ask for a style, like
        harder wording or a different language.
      </p>
    </div>
  );
}
