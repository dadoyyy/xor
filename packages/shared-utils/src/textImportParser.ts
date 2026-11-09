import type { AnswerKey, PublicChoices, QType } from "@xor/shared-types";

export const MAX_IMPORT_TEXT_BYTES = 250_000; // ~250 KB safe limit for single text upload
export const MAX_IMPORT_ITEMS = 100;
export const MIN_IMPORT_ITEMS = 1;

export type ImportType = "flashcards" | "quiz" | "mixed_quiz";

export type ParsedFlashcardItem = {
  kind: "flashcard";
  lineNumber: number;
  front: string;
  back: string;
  hint?: string;
  tag?: string;
};

export type ParsedQuizQuestionItem = {
  kind: "quiz_question";
  lineNumber: number;
  qtype: QType;
  prompt: string;
  choices: PublicChoices;
  points: number;
  answerKey: AnswerKey;
  explanation?: string;
  displayAnswerText: string;
};

export type ParsedImportItem = ParsedFlashcardItem | ParsedQuizQuestionItem;

export type ParseError = {
  line: number;
  message: string;
  snippet?: string;
};

export type TextImportParseResult = {
  ok: boolean;
  detectedType: ImportType;
  items: ParsedImportItem[];
  errors: ParseError[];
  summary: {
    totalItems: number;
    flashcardsCount: number;
    mcqCount: number;
    fillBlankCount: number;
    estimatedPoints: number;
  };
};

/**
 * Deterministically parses structured study text without calling AI models.
 * Supported syntaxes:
 * 1. Flashcards Q&A:
 *    Q: <prompt>
 *    A: <answer>
 *    (or "term :: definition")
 *
 * 2. Standalone Multiple Choice (MCQ):
 *    [MCQ] <prompt>
 *    A) Option 1
 *    B) Option 2 *
 *    C) Option 3
 *    D) Option 4
 *    (or ANSWER: B / ANSWER: Option 2)
 *
 * 3. Mixed MCQ + Fill in the Blank:
 *    [MCQ] ...
 *    [BLANK] The capital of France is ________.
 *    ANSWER: Paris
 */
export function parseStructuredImportText(rawText: string): TextImportParseResult {
  const errors: ParseError[] = [];
  const items: ParsedImportItem[] = [];

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return {
      ok: false,
      detectedType: "flashcards",
      items: [],
      errors: [{ line: 1, message: "Import text cannot be empty." }],
      summary: { totalItems: 0, flashcardsCount: 0, mcqCount: 0, fillBlankCount: 0, estimatedPoints: 0 },
    };
  }

  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > MAX_IMPORT_TEXT_BYTES) {
    return {
      ok: false,
      detectedType: "flashcards",
      items: [],
      errors: [
        {
          line: 1,
          message: `Text is too large (${Math.round(byteLength / 1024)} KB). Maximum allowed size is ${Math.round(
            MAX_IMPORT_TEXT_BYTES / 1024,
          )} KB.`,
        },
      ],
      summary: { totalItems: 0, flashcardsCount: 0, mcqCount: 0, fillBlankCount: 0, estimatedPoints: 0 },
    };
  }

  const lines = rawText.split(/\r?\n/);
  const blocks: { startLine: number; lines: { lineNum: number; text: string }[] }[] = [];
  let currentBlock: { lineNum: number; text: string }[] = [];
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentBlock.length > 0) {
        blocks.push({ startLine: blockStartLine, lines: currentBlock });
        currentBlock = [];
      }
    } else {
      if (currentBlock.length === 0) {
        blockStartLine = i + 1;
      }
      currentBlock.push({ lineNum: i + 1, text: trimmed });
    }
  }
  if (currentBlock.length > 0) {
    blocks.push({ startLine: blockStartLine, lines: currentBlock });
  }

  for (const block of blocks) {
    if (items.length >= MAX_IMPORT_ITEMS) {
      errors.push({
        line: block.startLine,
        message: `Maximum limit of ${MAX_IMPORT_ITEMS} items reached. Remaining blocks ignored.`,
      });
      break;
    }

    const firstLine = block.lines[0]!.text;
    const lowerFirst = firstLine.toLowerCase();

    // Check for explicit markers
    if (lowerFirst.startsWith("[mcq]") || lowerFirst.startsWith("mcq:")) {
      parseMcqBlock(block, items, errors);
    } else if (lowerFirst.startsWith("[blank]") || lowerFirst.startsWith("[fill]") || lowerFirst.startsWith("blank:")) {
      parseBlankBlock(block, items, errors);
    } else if (lowerFirst.startsWith("q:") || lowerFirst.startsWith("question:")) {
      parseQaBlock(block, items, errors);
    } else if (block.lines.some((l) => /^[a-d]\)|\([a-d]\)/i.test(l.text)) || /^\d+[\.\)]\s+/.test(firstLine)) {
      // Looks like a numbered MCQ block without explicit [MCQ] header
      parseMcqBlock(block, items, errors);
    } else if (block.lines.every((l) => l.text.includes("::"))) {
      for (const line of block.lines) {
        if (items.length >= MAX_IMPORT_ITEMS) {
          errors.push({
            line: line.lineNum,
            message: `Maximum limit of ${MAX_IMPORT_ITEMS} items reached. Remaining lines ignored.`,
          });
          break;
        }
        parseTermDefinitionLine(line, items, errors);
      }
    } else if (block.lines.length === 1 && firstLine.includes("::")) {
      parseTermDefinitionLine(block.lines[0]!, items, errors);
    } else if (block.lines.length >= 2 && block.lines.some((l) => /^a[:\-]/i.test(l.text) || /^answer[:\-]/i.test(l.text))) {
      // Multi-line Q/A block
      parseQaBlock(block, items, errors);
    } else {
      errors.push({
        line: block.startLine,
        message: `Unrecognized block format. Use "Q: ... A: ...", "[MCQ] ...", "[BLANK] ...", or "Term :: Definition".`,
        snippet: firstLine.slice(0, 80),
      });
    }
  }

  let flashcardsCount = 0;
  let mcqCount = 0;
  let fillBlankCount = 0;
  let estimatedPoints = 0;

  for (const item of items) {
    if (item.kind === "flashcard") {
      flashcardsCount++;
    } else {
      if (item.qtype === "multiple_choice") mcqCount++;
      if (item.qtype === "fill_blank") fillBlankCount++;
      estimatedPoints += item.points;
    }
  }

  let detectedType: ImportType = "flashcards";
  if (flashcardsCount > 0 && mcqCount === 0 && fillBlankCount === 0) {
    detectedType = "flashcards";
  } else if (flashcardsCount === 0 && mcqCount > 0 && fillBlankCount === 0) {
    detectedType = "quiz";
  } else {
    detectedType = "mixed_quiz";
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "No valid study items found in text." });
  }

  return {
    ok: errors.length === 0 && items.length >= MIN_IMPORT_ITEMS,
    detectedType,
    items,
    errors,
    summary: {
      totalItems: items.length,
      flashcardsCount,
      mcqCount,
      fillBlankCount,
      estimatedPoints,
    },
  };
}

function parseQaBlock(
  block: { startLine: number; lines: { lineNum: number; text: string }[] },
  items: ParsedImportItem[],
  errors: ParseError[],
) {
  let prompt = "";
  let answer = "";
  let promptLine = block.startLine;
  let inAnswer = false;

  for (const l of block.lines) {
    const text = l.text;
    const matchQ = text.match(/^(?:q|question)\s*[:\-]\s*(.*)$/i);
    const matchA = text.match(/^(?:a|answer)\s*[:\-]\s*(.*)$/i);

    if (matchQ) {
      prompt = matchQ[1]!.trim();
      promptLine = l.lineNum;
      inAnswer = false;
    } else if (matchA) {
      answer = matchA[1]!.trim();
      inAnswer = true;
    } else if (inAnswer) {
      answer += (answer ? "\n" : "") + text;
    } else if (prompt) {
      prompt += " " + text;
    } else {
      prompt = text;
      promptLine = l.lineNum;
    }
  }

  if (!prompt) {
    errors.push({ line: promptLine, message: "Missing flashcard question (Q:)." });
    return;
  }
  if (!answer) {
    errors.push({ line: promptLine, message: "Missing flashcard answer (A:)." });
    return;
  }

  items.push({
    kind: "flashcard",
    lineNumber: promptLine,
    front: prompt.slice(0, 1000).trim(),
    back: answer.slice(0, 2000).trim(),
  });
}

function parseTermDefinitionLine(
  line: { lineNum: number; text: string },
  items: ParsedImportItem[],
  errors: ParseError[],
) {
  const parts = line.text.split("::");
  if (parts.length < 2) {
    errors.push({ line: line.lineNum, message: "Expected format 'Term :: Definition'." });
    return;
  }
  const term = parts[0]!.trim();
  const def = parts.slice(1).join("::").trim();

  if (!term || !def) {
    errors.push({ line: line.lineNum, message: "Both term and definition must be non-empty." });
    return;
  }

  items.push({
    kind: "flashcard",
    lineNumber: line.lineNum,
    front: term.slice(0, 1000),
    back: def.slice(0, 2000),
  });
}

function parseBlankBlock(
  block: { startLine: number; lines: { lineNum: number; text: string }[] },
  items: ParsedImportItem[],
  errors: ParseError[],
) {
  let prompt = "";
  let answer = "";
  const promptLine = block.startLine;

  for (let idx = 0; idx < block.lines.length; idx++) {
    const l = block.lines[idx]!;
    const cleanText = l.text.replace(/^\[(?:blank|fill)\]\s*/i, "").replace(/^blank\s*[:\-]\s*/i, "");

    const matchAnswer = cleanText.match(/^answer\s*[:\-]\s*(.*)$/i);
    if (matchAnswer) {
      answer = matchAnswer[1]!.trim();
    } else if (idx === 0) {
      prompt = cleanText;
    } else if (!answer) {
      prompt += " " + cleanText;
    }
  }

  if (!prompt) {
    errors.push({ line: promptLine, message: "Missing fill-in-the-blank prompt." });
    return;
  }
  if (!answer) {
    errors.push({ line: promptLine, message: "Missing fill-in-the-blank answer (use 'ANSWER: <word>')." });
    return;
  }

  items.push({
    kind: "quiz_question",
    lineNumber: promptLine,
    qtype: "fill_blank",
    prompt: prompt.slice(0, 500).trim(),
    choices: null,
    points: 1,
    answerKey: { text: answer.trim(), accepted: [answer.trim()] },
    displayAnswerText: answer.trim(),
  });
}

function parseMcqBlock(
  block: { startLine: number; lines: { lineNum: number; text: string }[] },
  items: ParsedImportItem[],
  errors: ParseError[],
) {
  let prompt = "";
  const options: { text: string; isCorrect: boolean }[] = [];
  let answerKeyText = "";
  let promptLine = block.startLine;

  for (let idx = 0; idx < block.lines.length; idx++) {
    const l = block.lines[idx]!;
    let t = l.text;

    if (idx === 0) {
      promptLine = l.lineNum;
      t = t.replace(/^\[mcq\]\s*/i, "").replace(/^mcq\s*[:\-]\s*/i, "").replace(/^\d+[\.\)]\s*/, "");
      // Check if options are inlined on the prompt line or subsequent lines
      const inlinedOpts = extractInlineOptions(t);
      if (inlinedOpts.options.length >= 2) {
        prompt = inlinedOpts.cleanPrompt;
        for (const opt of inlinedOpts.options) {
          options.push(opt);
        }
        continue;
      }
      prompt = t;
      continue;
    }

    const ansMatch = t.match(/^answer\s*[:\-]\s*([a-d0-9\w\s]+)$/i);
    if (ansMatch) {
      answerKeyText = ansMatch[1]!.trim();
      continue;
    }

    // Check for inline choices on this line (e.g. A) Ribosome  B) Mitochondrion *)
    const inlined = extractInlineOptions(t);
    if (inlined.options.length > 0) {
      for (const opt of inlined.options) {
        options.push(opt);
      }
      continue;
    }

    // Standard choice on single line: A) Option
    const optMatch = t.match(/^(?:([a-d])[\.\)]|\(([a-d])\))\s*(.*)$/i);
    if (optMatch) {
      let optText = optMatch[3]!.trim();
      let isCorrect = false;
      if (optText.endsWith("*") || optText.includes("[x]") || optText.includes("(correct)")) {
        isCorrect = true;
        optText = optText.replace(/\*$/, "").replace(/\[x\]/gi, "").replace(/\(correct\)/gi, "").trim();
      }
      options.push({ text: optText, isCorrect });
      continue;
    }

    // Continuation of prompt
    if (options.length === 0) {
      prompt += " " + t;
    }
  }

  if (!prompt.trim()) {
    errors.push({ line: promptLine, message: "Missing MCQ question prompt." });
    return;
  }
  if (options.length < 2) {
    errors.push({ line: promptLine, message: "MCQ question requires at least 2 options (A, B...)." });
    return;
  }
  if (options.length > 8) {
    errors.push({ line: promptLine, message: "MCQ question cannot exceed 8 options." });
    return;
  }

  let correctIndex = options.findIndex((o) => o.isCorrect);

  if (correctIndex === -1 && answerKeyText) {
    const letter = answerKeyText.toUpperCase().trim();
    if (letter.length === 1 && letter >= "A" && letter <= "H") {
      correctIndex = letter.charCodeAt(0) - 65;
    } else {
      correctIndex = options.findIndex((o) => o.text.toLowerCase() === answerKeyText.toLowerCase());
    }
  }

  if (correctIndex < 0 || correctIndex >= options.length) {
    errors.push({
      line: promptLine,
      message: `No correct answer marked for MCQ. Add an asterisk (*) after the right option or specify 'ANSWER: B'.`,
    });
    return;
  }

  items.push({
    kind: "quiz_question",
    lineNumber: promptLine,
    qtype: "multiple_choice",
    prompt: prompt.slice(0, 500).trim(),
    choices: { options: options.map((o) => o.text.slice(0, 200).trim()) },
    points: 1,
    answerKey: { index: correctIndex },
    displayAnswerText: options[correctIndex]!.text,
  });
}

function extractInlineOptions(text: string): { cleanPrompt: string; options: { text: string; isCorrect: boolean }[] } {
  const optRegex = /(?:^|\s+)([A-D])[\)\.]\s+([^A-D\)\.]+?)(?=(?:\s+[A-D][\)\.]|$))/gi;
  const options: { text: string; isCorrect: boolean }[] = [];
  let match: RegExpExecArray | null;

  let firstIndex = -1;
  while ((match = optRegex.exec(text)) !== null) {
    if (firstIndex === -1) firstIndex = match.index;
    let rawText = match[2]!.trim();
    let isCorrect = false;
    if (rawText.endsWith("*") || rawText.includes("[x]") || rawText.includes("(correct)")) {
      isCorrect = true;
      rawText = rawText.replace(/\*$/, "").replace(/\[x\]/gi, "").replace(/\(correct\)/gi, "").trim();
    }
    options.push({ text: rawText, isCorrect });
  }

  const cleanPrompt = firstIndex > -1 ? text.slice(0, firstIndex).trim() : text.trim();
  return { cleanPrompt, options };
}
