export type QType =
  | "multiple_choice"
  | "true_false"
  | "identification"
  | "fill_blank"
  | "enumeration"
  | "matching"
  | "scenario"
  | "essay";

export type QuestionTypeInfo = {
  id: QType;
  label: string;
  hint: string;
  defaultPoints?: number;
};

export type PublicChoices =
  | { options: string[] }
  | { count: number }
  | { left: string[]; right: string[] }
  | null;

export type AnswerKey =
  | { index: number }
  | { value: boolean }
  | { text: string; accepted: string[] }
  | { items: string[] }
  | { pairs: number[] }
  | { model_answer: string; rubric: string };

export type Response =
  | { index: number | null }
  | { value: boolean | null }
  | { text: string }
  | { items: string[] }
  | { pairs: (number | null)[] };
