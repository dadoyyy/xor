// Question types xor can generate. Shared by server and client.

export const QUESTION_TYPES = [
  { id: "multiple_choice", label: "Multiple choice", hint: "Pick one of four options" },
  { id: "true_false", label: "True or false", hint: "Is the statement right?" },
  { id: "identification", label: "Identification", hint: "Name the term or concept" },
  { id: "fill_blank", label: "Fill in the blank", hint: "Complete the sentence" },
  { id: "enumeration", label: "Enumeration", hint: "List several items" },
  { id: "matching", label: "Matching", hint: "Pair terms with meanings" },
  { id: "scenario", label: "Scenario-based", hint: "Apply ideas to a situation" },
  { id: "essay", label: "Essay", hint: "Explain in your own words" },
] as const;

export type QType = (typeof QUESTION_TYPES)[number]["id"];
export const QTYPE_IDS = QUESTION_TYPES.map((t) => t.id) as QType[];

export function qtypeLabel(id: string) {
  return QUESTION_TYPES.find((t) => t.id === id)?.label ?? id;
}

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Points each question type is worth. Enumeration/matching: 1 per item. */
export function basePoints(type: QType, itemCount = 1): number {
  switch (type) {
    case "enumeration":
    case "matching":
      return Math.max(1, itemCount);
    case "scenario":
      return 5;
    case "essay":
      return 10;
    default:
      return 1;
  }
}

/** Types whose answers are checked by the AI (or partly). */
export const AI_GRADED: QType[] = ["identification", "fill_blank", "enumeration", "scenario", "essay"];

// Shapes stored in quiz_questions.choices (public) and quiz_answer_keys.answer (private)
export type PublicChoices =
  | { options: string[] } // multiple_choice
  | { count: number } // enumeration
  | { left: string[]; right: string[] } // matching (right is shuffled)
  | null;

export type AnswerKey =
  | { index: number } // multiple_choice
  | { value: boolean } // true_false
  | { text: string; accepted: string[] } // identification, fill_blank
  | { items: string[] } // enumeration
  | { pairs: number[] } // matching: pairs[leftIndex] = rightIndex
  | { model_answer: string; rubric: string }; // scenario, essay

// What a student submits per question
export type Response =
  | { index: number }
  | { value: boolean }
  | { text: string }
  | { items: string[] }
  | { pairs: (number | null)[] }
  | null;

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
