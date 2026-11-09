import type { QType } from "@xor/shared-types";
import { QUESTION_TYPES } from "@xor/shared-utils";

export type StudyAgentTask = "extract_notes" | "generate_flashcards" | "generate_quiz" | "grade_answers";

export const AGENT_QUESTION_TYPES: readonly QType[] = QUESTION_TYPES.map((q) => q.id);

