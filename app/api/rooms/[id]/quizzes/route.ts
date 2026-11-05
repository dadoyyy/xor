import { z } from "zod";
import { apiMember, errorResponse, HttpError } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { useQuota } from "@/lib/limits";
import { loadNotes } from "@/lib/notes";
import { generateQuiz } from "@/lib/ai/gemini";
import { QTYPE_IDS, type QType } from "@/lib/questions";

export const maxDuration = 300;

const Body = z.object({
  materialIds: z.array(z.string().uuid()).min(1).max(10),
  types: z.array(z.enum(QTYPE_IDS as [QType, ...QType[]])).min(1),
  count: z.number().int().min(3).max(50),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  timeLimitMinutes: z.number().int().min(1).max(240).nullable(),
  title: z.string().max(80).optional(),
  instructions: z.string().max(600).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Check the form and try again.");
    const body = parsed.data;

    const { supabase, user } = await apiMember(roomId);
    const { notes, materialIds } = await loadNotes(supabase, roomId, body.materialIds);
    const refund = await useQuota(user.id, "generate");

    const types = Array.from(new Set(body.types));
    let out;
    try {
      out = await generateQuiz(notes, types, body.count, body.difficulty, body.instructions?.trim() || undefined);
    } catch (e) {
      await refund().catch(() => {});
      throw e;
    }
    const maxScore = out.questions.reduce((s, q) => s + q.points, 0);

    const admin = createAdmin();
    const { data: quiz, error } = await admin
      .from("quizzes")
      .insert({
        room_id: roomId,
        created_by: user.id,
        title: body.title?.trim() || out.title,
        material_ids: materialIds,
        question_types: types,
        difficulty: body.difficulty,
        question_count: out.questions.length,
        time_limit_minutes: body.timeLimitMinutes,
        max_score: maxScore,
      })
      .select("id")
      .single();
    if (error) throw error;

    try {
      const { data: rows, error: qErr } = await admin
        .from("quiz_questions")
        .insert(
          out.questions.map((q, i) => ({
            quiz_id: quiz.id,
            position: i,
            qtype: q.qtype,
            prompt: q.prompt,
            choices: q.choices,
            points: q.points,
          })),
        )
        .select("id, position");
      if (qErr) throw qErr;

      const byPos = new Map(rows!.map((r) => [r.position, r.id]));
      const { error: kErr } = await admin.from("quiz_answer_keys").insert(
        out.questions.map((q, i) => ({ question_id: byPos.get(i), answer: q.answer, explanation: q.explanation })),
      );
      if (kErr) throw kErr;
    } catch (e) {
      await admin.from("quizzes").delete().eq("id", quiz.id);
      throw e;
    }

    return Response.json({ id: quiz.id });
  } catch (e) {
    return errorResponse(e);
  }
}
