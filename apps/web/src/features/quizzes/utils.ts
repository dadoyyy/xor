import type { AnswerKey } from "@/types/questions";
import type { Choices, Resp } from "./types";

const LETTERS = "ABCDEFGHIJ";

export const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function showResponse(qtype: string, choices: Choices, r: Resp): string {
  if (!r) return "(no answer)";
  switch (qtype) {
    case "multiple_choice":
      return typeof r.index === "number" ? `${LETTERS[r.index]}. ${choices?.options?.[r.index] ?? ""}` : "(no answer)";
    case "true_false":
      return typeof r.value === "boolean" ? (r.value ? "True" : "False") : "(no answer)";
    case "enumeration":
      return Array.isArray(r.items) && r.items.some((s) => String(s).trim())
        ? (r.items as string[]).filter((s) => s.trim()).join(", ")
        : "(no answer)";
    case "matching":
      return Array.isArray(r.pairs)
        ? (choices?.left ?? []).map((l, i) => `${l} → ${r.pairs && (r.pairs as (number | null)[])[i] != null ? LETTERS[(r.pairs as number[])[i]] : "?"}`).join("; ")
        : "(no answer)";
    default:
      return typeof r.text === "string" && r.text.trim() ? r.text : "(no answer)";
  }
}

export function showKey(qtype: string, choices: Choices, k: AnswerKey): string {
  if ("index" in k) return `${LETTERS[k.index]}. ${choices?.options?.[k.index] ?? ""}`;
  if ("value" in k) return k.value ? "True" : "False";
  if ("accepted" in k) return k.text;
  if ("items" in k) return k.items.join(", ");
  if ("pairs" in k) return (choices?.left ?? []).map((l, i) => `${l} → ${LETTERS[k.pairs[i]]}`).join("; ");
  if ("model_answer" in k) return k.model_answer;
  return "";
}

