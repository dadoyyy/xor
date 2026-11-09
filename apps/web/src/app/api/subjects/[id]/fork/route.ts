import { apiSubjectMember, errorResponse, HttpError } from "@/services/authService";
import { checkUserStorageQuota, useQuota } from "@/services/limitService";
import { createAdmin } from "@/lib/supabase/server";

const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCandidateShareKey(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += KEY_ALPHABET[bytes[i]! % KEY_ALPHABET.length];
  }
  return `XOR-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

async function generateUniqueShareKey(admin: ReturnType<typeof createAdmin>): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateCandidateShareKey();
    const { data } = await admin.from("subjects").select("id").eq("share_key", candidate).maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Could not generate a unique share key.");
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin: ReturnType<typeof createAdmin> | null = null;
  let refundQuota: (() => Promise<void>) | null = null;
  const copiedStoragePaths: string[] = [];
  let createdSubjectId: string | null = null;

  try {
    const { id: sourceSubjectId } = await params;

    // 1. Check subject access & fork permission BEFORE creating the admin client
    const { user, subject: source, isOwner, canEdit } = await apiSubjectMember(sourceSubjectId);
    if (!source.allow_fork && !isOwner) {
      throw new HttpError(403, "The owner has disabled forking for this subject.");
    }

    // 2. Enforce daily fork rate limit
    refundQuota = await useQuota(user.id, "fork");

    admin = createAdmin();

    // 3. Load source materials and verify per-user storage quota before creating rows or copying files
    const { data: sourceMaterials, error: matReadErr } = await admin
      .from("materials")
      .select("id, title, source_type, file_path, file_size, status, content, page_count")
      .eq("subject_id", sourceSubjectId)
      .order("created_at", { ascending: true });
    if (matReadErr) throw matReadErr;

    const additionalBytes = (sourceMaterials ?? []).reduce(
      (sum, mat) => sum + (mat.file_path ? Number(mat.file_size ?? 0) : 0),
      0,
    );
    await checkUserStorageQuota(user.id, additionalBytes);

    const shareKey = await generateUniqueShareKey(admin);
    const forkBase = source.name.trim().slice(0, 52).trim();
    const forkName = `${forkBase} (Fork)`;

    // 4. Create the forked subject owned by the current user
    const { data: newSubject, error: subjErr } = await admin
      .from("subjects")
      .insert({
        name: forkName,
        description: source.description,
        owner_id: user.id,
        share_key: shareKey,
        share_enabled: false,
        allow_fork: true,
        forked_from_id: source.id,
        forked_from_name: source.name,
        forked_from_owner_id: source.owner_id,
        cover: source.cover,
      })
      .select("id, name")
      .single();
    if (subjErr || !newSubject) throw subjErr ?? new Error("Failed to create forked subject.");
    createdSubjectId = newSubject.id as string;

    // 5. Add owner entry in library_entries
    const { error: libErr } = await admin.from("library_entries").insert({
      subject_id: createdSubjectId,
      user_id: user.id,
      role: "owner",
      cover: source.cover,
    });
    if (libErr) throw libErr;

    // 6. Physically copy storage files & clone materials
    const materialIdMap = new Map<string, string>();

    for (const mat of sourceMaterials ?? []) {
      let newFilePath: string | null = null;
      if (mat.file_path) {
        newFilePath = `${createdSubjectId}/${crypto.randomUUID()}.pdf`;
        const { error: copyErr } = await admin.storage.from("materials").copy(mat.file_path, newFilePath);
        if (copyErr) {
          throw new HttpError(500, `Failed to copy storage file for "${mat.title}".`);
        }
        copiedStoragePaths.push(newFilePath);
      }

      const { data: clonedMat, error: matInsertErr } = await admin
        .from("materials")
        .insert({
          subject_id: createdSubjectId,
          uploaded_by: user.id,
          title: mat.title,
          source_type: mat.source_type ?? "pdf",
          forked_from_id: mat.id,
          file_path: newFilePath,
          file_size: mat.file_size,
          status: mat.status,
          content: mat.content,
          page_count: mat.page_count,
        })
        .select("id")
        .single();
      if (matInsertErr || !clonedMat) throw matInsertErr ?? new Error("Failed to clone material.");
      materialIdMap.set(mat.id as string, clonedMat.id as string);
    }

    // 7. Clone flashcard decks & cards
    const { data: sourceDecks, error: deckReadErr } = await admin
      .from("decks")
      .select("id, title, difficulty, source_type, material_ids, cards(position, front, back)")
      .eq("subject_id", sourceSubjectId)
      .order("created_at", { ascending: true });
    if (deckReadErr) throw deckReadErr;

    for (const deck of sourceDecks ?? []) {
      const remappedMaterialIds = Array.isArray(deck.material_ids)
        ? (deck.material_ids as string[]).map((id) => materialIdMap.get(id)).filter((id): id is string => Boolean(id))
        : [];

      const { data: clonedDeck, error: deckInsertErr } = await admin
        .from("decks")
        .insert({
          subject_id: createdSubjectId,
          created_by: user.id,
          title: deck.title,
          difficulty: deck.difficulty,
          source_type: deck.source_type ?? "ai",
          forked_from_id: deck.id,
          material_ids: remappedMaterialIds,
        })
        .select("id")
        .single();
      if (deckInsertErr || !clonedDeck) throw deckInsertErr ?? new Error("Failed to clone deck.");

      const cards = (deck.cards as { position: number; front: string; back: string }[] | null) ?? [];
      if (cards.length > 0) {
        const { error: cardInsertErr } = await admin.from("cards").insert(
          cards.map((c) => ({
            deck_id: clonedDeck.id,
            position: c.position,
            front: c.front,
            back: c.back,
          })),
        );
        if (cardInsertErr) throw cardInsertErr;
      }
    }

    // 8. Clone quizzes:
    //    - Owners/editors copy all quizzes.
    //    - Viewers ONLY copy quizzes they have already completed (status = 'graded'),
    //      preventing viewers from leaking answer keys for uncompleted leaderboard quizzes.
    let completedQuizIds: Set<string> | null = null;
    if (!canEdit) {
      const { data: gradedAttempts, error: attErr } = await admin
        .from("attempts")
        .select("quiz_id")
        .eq("subject_id", sourceSubjectId)
        .eq("user_id", user.id)
        .eq("status", "graded");
      if (attErr) throw attErr;
      completedQuizIds = new Set((gradedAttempts ?? []).map((a) => a.quiz_id as string));
    }

    const { data: sourceQuizzes, error: quizReadErr } = await admin
      .from("quizzes")
      .select("id, title, source_type, material_ids, question_types, difficulty, question_count, time_limit_minutes, max_score")
      .eq("subject_id", sourceSubjectId)
      .order("created_at", { ascending: true });
    if (quizReadErr) throw quizReadErr;

    const quizzesToCopy = (sourceQuizzes ?? []).filter(
      (q) => canEdit || (completedQuizIds !== null && completedQuizIds.has(q.id as string)),
    );

    for (const quiz of quizzesToCopy) {
      const remappedMaterialIds = Array.isArray(quiz.material_ids)
        ? (quiz.material_ids as string[]).map((id) => materialIdMap.get(id)).filter((id): id is string => Boolean(id))
        : [];

      const { data: clonedQuiz, error: quizInsertErr } = await admin
        .from("quizzes")
        .insert({
          subject_id: createdSubjectId,
          created_by: user.id,
          title: quiz.title,
          source_type: quiz.source_type ?? "ai",
          forked_from_id: quiz.id,
          material_ids: remappedMaterialIds,
          question_types: quiz.question_types,
          difficulty: quiz.difficulty,
          question_count: quiz.question_count,
          time_limit_minutes: quiz.time_limit_minutes,
          max_score: quiz.max_score,
        })
        .select("id")
        .single();
      if (quizInsertErr || !clonedQuiz) throw quizInsertErr ?? new Error("Failed to clone quiz.");

      const { data: sourceQuestions, error: qReadErr } = await admin
        .from("quiz_questions")
        .select("id, position, qtype, prompt, choices, points, quiz_answer_keys(answer, explanation)")
        .eq("quiz_id", quiz.id)
        .order("position", { ascending: true });
      if (qReadErr) throw qReadErr;

      if (sourceQuestions && sourceQuestions.length > 0) {
        const { data: insertedQuestions, error: qInsertErr } = await admin
          .from("quiz_questions")
          .insert(
            sourceQuestions.map((q) => ({
              quiz_id: clonedQuiz.id,
              position: q.position,
              qtype: q.qtype,
              prompt: q.prompt,
              choices: q.choices,
              points: q.points,
            })),
          )
          .select("id, position");
        if (qInsertErr || !insertedQuestions) throw qInsertErr ?? new Error("Failed to clone quiz questions.");

        const newQuestionIdByPos = new Map(insertedQuestions.map((r) => [r.position as number, r.id as string]));
        const answerKeyRows = sourceQuestions
          .map((q) => {
            const keyObj = Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys;
            const newQId = newQuestionIdByPos.get(q.position as number);
            if (!keyObj || !newQId) return null;
            return {
              question_id: newQId,
              answer: keyObj.answer,
              explanation: keyObj.explanation,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (answerKeyRows.length > 0) {
          const { error: keyInsertErr } = await admin.from("quiz_answer_keys").insert(answerKeyRows);
          if (keyInsertErr) throw keyInsertErr;
        }
      }
    }

    return Response.json({ id: createdSubjectId, name: newSubject.name as string });
  } catch (e) {
    if (refundQuota) {
      await refundQuota().catch(() => {});
    }
    if (admin && copiedStoragePaths.length > 0) {
      try {
        await admin.storage.from("materials").remove(copiedStoragePaths);
      } catch {
        // ignore storage cleanup errors
      }
    }
    if (admin && createdSubjectId) {
      try {
        await admin.from("subjects").delete().eq("id", createdSubjectId);
      } catch {
        // ignore rollback cleanup errors
      }
    }
    return errorResponse(e);
  }
}
