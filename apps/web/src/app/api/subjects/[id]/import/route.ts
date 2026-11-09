import { z } from "zod";
import { apiSubjectMember, errorResponse, HttpError } from "@/services/authService";
import { useQuota } from "@/services/limitService";
import { recordStudyActivity } from "@/services/activityService";
import { createAdmin } from "@/lib/supabase/server";
import {
  parseStructuredImportText,
  type ParsedFlashcardItem,
  type ParsedQuizQuestionItem,
} from "@xor/shared-utils";

const Body = z.object({
  text: z.string().min(1).max(250_000),
  title: z.string().trim().max(120).optional(),
  action: z.enum(["preview", "commit"]).default("preview"),
  target: z.enum(["auto", "flashcards", "quiz"]).default("auto"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let refundQuota: (() => Promise<void>) | null = null;
  try {
    const { id: subjectId } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(400, "Invalid import payload. Text must be between 1 and 250,000 characters.");
    }
    const { text, title, action, target } = parsed.data;

    // Verify membership: preview requires viewer/any member; commit requires editor/owner
    const { user, isOwner, canEdit } = await apiSubjectMember(subjectId, {
      requireEdit: action === "commit",
    });

    // Parse completely deterministically without calling any AI models
    const result = parseStructuredImportText(text);

    // If user requested preview only, return parsed structure and any line-numbered errors
    if (action === "preview") {
      return Response.json({
        ok: result.ok,
        detectedType: result.detectedType,
        summary: result.summary,
        errors: result.errors,
        items: result.items,
      });
    }

    // Action is commit: must be valid
    if (!result.ok || result.items.length === 0) {
      return Response.json(
        {
          error: "Text import has validation errors. Fix the errors shown in the preview step before saving.",
          errors: result.errors,
        },
        { status: 422 },
      );
    }

    // Check rate limit for commit
    refundQuota = await useQuota(user.id, "import");

    const admin = createAdmin();
    const effectiveTitle = title?.trim() || `Imported Study Set (${new Date().toLocaleDateString()})`;

    const flashcardItems = result.items.filter((it): it is ParsedFlashcardItem => it.kind === "flashcard");
    const quizItems = result.items.filter((it): it is ParsedQuizQuestionItem => it.kind === "quiz_question");

    let createdDeckId: string | null = null;
    let createdQuizId: string | null = null;
    let createdMaterialId: string | null = null;

    // 1. Create text material row for reference and traceability
    const { data: material, error: matErr } = await admin
      .from("materials")
      .insert({
        subject_id: subjectId,
        uploaded_by: user.id,
        title: effectiveTitle,
        source_type: "text",
        status: "ready",
        content: text.slice(0, 100_000),
      })
      .select("id")
      .single();
    if (matErr || !material) throw matErr ?? new Error("Failed to save material record.");
    createdMaterialId = material.id as string;

    // Record study activity for material_added
    await recordStudyActivity(user.id, "material_added", 1, 0, createdMaterialId).catch(() => {});

    // 2. Create Deck if there are flashcards or if target === "flashcards"
    if (flashcardItems.length > 0) {
      const { data: deck, error: deckErr } = await admin
        .from("decks")
        .insert({
          subject_id: subjectId,
          created_by: user.id,
          title: effectiveTitle,
          difficulty: "medium",
          source_type: "import",
          material_ids: [createdMaterialId],
        })
        .select("id")
        .single();
      if (deckErr || !deck) throw deckErr ?? new Error("Failed to create deck.");
      createdDeckId = deck.id as string;

      const { error: cardErr } = await admin.from("cards").insert(
        flashcardItems.map((c, idx) => ({
          deck_id: createdDeckId,
          position: idx,
          front: c.front,
          back: c.back,
        })),
      );
      if (cardErr) throw cardErr;
    }

    // 3. Create Quiz if there are quiz questions
    if (quizItems.length > 0) {
      const qtypes = Array.from(new Set(quizItems.map((q) => q.qtype)));
      const maxScore = quizItems.reduce((acc, q) => acc + q.points, 0);

      const { data: quiz, error: quizErr } = await admin
        .from("quizzes")
        .insert({
          subject_id: subjectId,
          created_by: user.id,
          title: effectiveTitle,
          source_type: "import",
          material_ids: [createdMaterialId],
          question_types: qtypes,
          difficulty: "medium",
          question_count: quizItems.length,
          time_limit_minutes: null,
          max_score: maxScore,
        })
        .select("id")
        .single();
      if (quizErr || !quiz) throw quizErr ?? new Error("Failed to create quiz.");
      createdQuizId = quiz.id as string;

      const { data: insertedQuestions, error: qErr } = await admin
        .from("quiz_questions")
        .insert(
          quizItems.map((q, idx) => ({
            quiz_id: createdQuizId,
            position: idx,
            qtype: q.qtype,
            prompt: q.prompt,
            choices: q.choices,
            points: q.points,
          })),
        )
        .select("id, position");
      if (qErr || !insertedQuestions) throw qErr ?? new Error("Failed to create quiz questions.");

      const byPos = new Map(insertedQuestions.map((r) => [r.position as number, r.id as string]));
      const answerRows = quizItems
        .map((q, idx) => {
          const qId = byPos.get(idx);
          if (!qId) return null;
          return {
            question_id: qId,
            answer: q.answerKey,
            explanation: q.explanation ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (answerRows.length > 0) {
        const { error: keyErr } = await admin.from("quiz_answer_keys").insert(answerRows);
        if (keyErr) throw keyErr;
      }
    }

    return Response.json({
      ok: true,
      materialId: createdMaterialId,
      deckId: createdDeckId,
      quizId: createdQuizId,
      summary: result.summary,
    });
  } catch (e) {
    if (refundQuota) {
      await refundQuota().catch(() => {});
    }
    return errorResponse(e);
  }
}

