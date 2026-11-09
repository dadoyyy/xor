import type { QType, QuestionTypeInfo } from "@xor/shared-types";

export const QUESTION_TYPES: readonly QuestionTypeInfo[] = [
  { id: "multiple_choice", label: "Multiple choice", hint: "4 options, 1 right", defaultPoints: 1 },
  { id: "true_false", label: "True or false", hint: "Quick check", defaultPoints: 1 },
  { id: "identification", label: "Identification", hint: "Name the term", defaultPoints: 1 },
  { id: "fill_blank", label: "Fill in the blank", hint: "Missing word", defaultPoints: 1 },
  { id: "enumeration", label: "Enumeration", hint: "List N items", defaultPoints: 3 },
  { id: "matching", label: "Matching type", hint: "Pair items up", defaultPoints: 4 },
  { id: "scenario", label: "Scenario-based", hint: "Apply to a case", defaultPoints: 3 },
  { id: "essay", label: "Essay / short answer", hint: "Explain in your words", defaultPoints: 5 },
] as const;

export const QTYPE_IDS = QUESTION_TYPES.map((q) => q.id) as [QType, ...QType[]];

export function qtypeLabel(t: string): string {
  return QUESTION_TYPES.find((q) => q.id === t)?.label ?? t;
}

export function basePoints(t: QType, n?: number): number {
  if ((t === "enumeration" || t === "matching") && typeof n === "number") {
    return Math.max(2, Math.min(8, n));
  }
  return QUESTION_TYPES.find((q) => q.id === t)?.defaultPoints ?? 1;
}

export function defaultPoints(qtype: QType, choices?: { count?: number; left?: unknown[] } | null): number {
  switch (qtype) {
    case "enumeration":
      return Math.max(2, Math.min(8, Number(choices?.count) || 3));
    case "matching":
      return Math.max(2, Math.min(8, Array.isArray(choices?.left) ? choices!.left.length : 4));
    case "scenario":
      return 3;
    case "essay":
      return 5;
    default:
      return 1;
  }
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
