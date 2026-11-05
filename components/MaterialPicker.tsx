"use client";
import { Check } from "lucide-react";

export type PickableMaterial = { id: string; title: string; pageCount: number | null };

export default function MaterialPicker({
  materials,
  selected,
  onChange,
}: {
  materials: PickableMaterial[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].slice(0, 10));

  return (
    <fieldset>
      <legend className="label">Study materials</legend>
      <ul className="grid gap-2">
        {materials.map((m) => {
          const on = selected.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(m.id)}
                className={`card-flat flex w-full items-center gap-3 px-3 py-2.5 text-left font-semibold transition-colors ${on ? "border-grape bg-grape-tint" : "hover:bg-lilac"}`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 ${on ? "border-grape bg-grape text-white" : "border-line bg-white"}`}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.title}</span>
                {m.pageCount ? <span className="text-xs text-ink-soft">{m.pageCount} pages</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-xs text-ink-soft">Pick up to 10.</p>
    </fieldset>
  );
}

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`chip px-3.5 py-1.5 text-sm ${value === o.id ? "chip-on" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
