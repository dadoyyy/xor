import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStructuredImportText,
  MAX_IMPORT_TEXT_BYTES,
  MAX_IMPORT_ITEMS,
  type ParsedFlashcardItem,
  type ParsedQuizQuestionItem,
} from "../src/textImportParser.ts";

test("textImportParser - Q&A flashcards", () => {
  const input = `
Q: What is photosynthesis?
A: The process by which plants convert light energy into chemical energy.

Question: What is the mitochondria?
Answer: The powerhouse of the cell.
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, true, "Expected parsing to succeed");
  assert.equal(res.detectedType, "flashcards");
  assert.equal(res.summary.totalItems, 2);
  assert.equal(res.summary.flashcardsCount, 2);
  assert.equal(res.errors.length, 0);

  const card1 = res.items[0] as ParsedFlashcardItem;
  assert.equal(card1.kind, "flashcard");
  assert.equal(card1.front, "What is photosynthesis?");
  assert.match(card1.back, /convert light energy/);

  const card2 = res.items[1] as ParsedFlashcardItem;
  assert.equal(card2.kind, "flashcard");
  assert.equal(card2.front, "What is the mitochondria?");
  assert.equal(card2.back, "The powerhouse of the cell.");
});

test("textImportParser - Term :: Definition flashcards", () => {
  const input = `
Osmosis :: Diffusion of water molecules across a selectively permeable membrane.
Mitosis :: A type of cell division that results in two daughter cells each having the same number of chromosomes.
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, true);
  assert.equal(res.detectedType, "flashcards");
  assert.equal(res.summary.totalItems, 2);

  const item1 = res.items[0] as ParsedFlashcardItem;
  assert.equal(item1.front, "Osmosis");
  assert.match(item1.back, /Diffusion of water/);

  const item2 = res.items[1] as ParsedFlashcardItem;
  assert.equal(item2.front, "Mitosis");
  assert.match(item2.back, /cell division/);
});

test("textImportParser - Multiple Choice with asterisk", () => {
  const input = `
[MCQ] Which planet is known as the Red Planet?
A) Venus
B) Mars *
C) Jupiter
D) Saturn
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, true);
  assert.equal(res.detectedType, "quiz");
  assert.equal(res.summary.mcqCount, 1);

  const q = res.items[0] as ParsedQuizQuestionItem;
  assert.equal(q.kind, "quiz_question");
  assert.equal(q.qtype, "multiple_choice");
  assert.equal(q.prompt, "Which planet is known as the Red Planet?");
  assert.deepEqual(q.choices?.options, ["Venus", "Mars", "Jupiter", "Saturn"]);
  assert.deepEqual(q.answerKey, { index: 1 });
  assert.equal(q.displayAnswerText, "Mars");
});

test("textImportParser - Multiple Choice with ANSWER: letter", () => {
  const input = `
1. What is the chemical symbol for Gold?
A) Ag
B) Au
C) Fe
D) Pb
ANSWER: B
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, true);
  assert.equal(res.detectedType, "quiz");
  assert.equal(res.summary.mcqCount, 1);

  const q = res.items[0] as ParsedQuizQuestionItem;
  assert.equal(q.prompt, "What is the chemical symbol for Gold?");
  assert.deepEqual(q.answerKey, { index: 1 });
  assert.equal(q.displayAnswerText, "Au");
});

test("textImportParser - Mixed MCQ and Fill-in-the-blank", () => {
  const input = `
[MCQ] Which organ pumps blood throughout the human body?
A) Lungs
B) Brain
C) Heart *
D) Liver

[BLANK] The largest organ of the human body is the ________.
ANSWER: skin
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, true);
  assert.equal(res.detectedType, "mixed_quiz");
  assert.equal(res.summary.totalItems, 2);
  assert.equal(res.summary.mcqCount, 1);
  assert.equal(res.summary.fillBlankCount, 1);
  assert.equal(res.summary.estimatedPoints, 2);

  const blank = res.items[1] as ParsedQuizQuestionItem;
  assert.equal(blank.kind, "quiz_question");
  assert.equal(blank.qtype, "fill_blank");
  assert.equal(blank.prompt, "The largest organ of the human body is the ________.");
  assert.deepEqual(blank.answerKey, { text: "skin", accepted: ["skin"] });
  assert.equal(blank.displayAnswerText, "skin");
});

test("textImportParser - Line-numbered error reporting", () => {
  const input = `
Q: Valid Question 1
A: Valid Answer 1

This is an invalid block without markers

[MCQ] Question without correct answer
A) Option 1
B) Option 2
C) Option 3
`;

  const res = parseStructuredImportText(input);
  assert.equal(res.ok, false);
  assert.equal(res.items.length, 1); // Valid item parsed
  assert.equal(res.errors.length, 2);

  // Error 1: line 5 - unrecognized block
  assert.equal(res.errors[0]?.line, 5);
  assert.match(res.errors[0]?.message ?? "", /Unrecognized block format/);

  // Error 2: line 7 - no correct answer marked
  assert.equal(res.errors[1]?.line, 7);
  assert.match(res.errors[1]?.message ?? "", /No correct answer marked/);
});

test("textImportParser - Enforces item limit and size limit", () => {
  // Empty text
  const emptyRes = parseStructuredImportText("");
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.errors[0]?.message, "Import text cannot be empty.");

  // Oversized text
  const largeText = "A".repeat(MAX_IMPORT_TEXT_BYTES + 10);
  const largeRes = parseStructuredImportText(largeText);
  assert.equal(largeRes.ok, false);
  assert.match(largeRes.errors[0]?.message ?? "", /Text is too large/);

  // 105 items should cap at MAX_IMPORT_ITEMS (100)
  const manyItems = Array.from({ length: 105 }, (_, i) => `Q: Question ${i + 1}\nA: Answer ${i + 1}`).join("\n\n");
  const manyRes = parseStructuredImportText(manyItems);
  assert.equal(manyRes.summary.totalItems, MAX_IMPORT_ITEMS);
  assert.equal(manyRes.errors.length, 1);
  assert.match(manyRes.errors[0]?.message ?? "", /Maximum limit of 100 items reached/);
});

