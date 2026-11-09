import { z } from "zod";
import { errorResponse, HttpError } from "@/services/authService";
import { recordStudyActivity } from "@/services/activityService";
import { createAdmin, createClient } from "@/lib/supabase/server";
import { useQuota } from "@/services/limitService";
import { gradeOpenAnswers, localTextMatch, type GradeItem } from "@/lib/ai/gemini";
import { normalize, type AnswerKey, type QType } from "@/utils/questions";

export const maxDuration = 120;

const Body = z.object({ answers: z.record(z.string(), z.unknown()) });

type Graded = { question_id: string; response: unknown; is_correct: boolean | null; points: number; feedback: string | null };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: attemptId } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Bad submission.");
    const answers = parsed.data.answers;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new HttpError(401, "Sign in first.");

    const admin = createAdmin();

    // Lock the attempt: only one submit can move it from in_progress → grading
    const { data: attempt } = await admin
      .from("attempts")
      .update({ status: "grading", submitted_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .select("id, quiz_id, subject_id, counts")
      .maybeSingle();
    if (!attempt) {
      const { data: existing } = await admin.from("attempts").select("id, status, user_id").eq("id", attemptId).maybeSingle();
      if (!existing || existing.user_id !== user.id) throw new HttpError(404, "Attempt not found.");
      return Response.json({ id: attemptId, status: existing.status });
    }

    try {
      const { data: questions } = await admin
        .from("quiz_questions")
        .select("id, qtype, prompt, choices, points, quiz_answer_keys(answer, explanation)")
        .eq("quiz_id", attempt.quiz_id)
        .order("position");

      const graded: Graded[] = [];
      const aiItems: GradeItem[] = [];

      for (const q of questions ?? []) {
        const keyRow = (Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys) as
          | { answer: AnswerKey; explanation: string | null }
          | undefined;
        if (!keyRow) continue;
        const key = keyRow.answer;
        const resp = (answers[q.id] ?? null) as Record<string, unknown> | null;
        const max = Number(q.points);
        const qtype = q.qtype as QType;
        const push = (points: number, extra: Partial<Graded> = {}) =>
          graded.push({
            question_id: q.id,
            response: resp,
            points,
            is_correct: points >= max,
            feedback: keyRow.explanation,
            ...extra,
          });

        switch (qtype) {
          case "multiple_choice":
            push(resp && "index" in key && resp.index === key.index ? max : 0);
            break;
          case "true_false":
            push(resp && "value" in key && resp.value === key.value ? max : 0);
            break;
          case "matching": {
            const want = "pairs" in key ? key.pairs : [];
            const got = Array.isArray(resp?.pairs) ? (resp!.pairs as (number | null)[]) : [];
            const right = want.filter((w, i) => got[i] === w).length;
            push(Math.min(max, right), { is_correct: right === want.length });
            break;
          }
          case "identification":
          case "fill_blank": {
            const text = typeof resp?.text === "string" ? resp.text : "";
            if (!text.trim()) push(0);
            else if ("accepted" in key && localTextMatch(key, text)) push(max);
            else aiItems.push({ id: q.id, qtype, prompt: q.prompt, max_points: max, expected: key, response: text });
            break;
          }
          case "enumeration": {
            const items = Array.isArray(resp?.items) ? (resp!.items as unknown[]).map(String).filter((s) => s.trim()) : [];
            const expected = "items" in key ? key.items : [];
            if (!items.length) {
              push(0);
              break;
            }
            const left = new Set(expected.map(normalize));
            let hits = 0;
            for (const it of items) {
              const n = normalize(it);
              if (left.has(n)) {
                left.delete(n);
                hits++;
              }
            }
            if (hits === expected.length) push(max);
            else
              aiItems.push({ id: q.id, qtype, prompt: q.prompt, max_points: max, expected: key, response: items.map((s, i) => `${i + 1}. ${s}`).join("\n") });
            break;
          }
          case "scenario":
          case "essay": {
            const text = typeof resp?.text === "string" ? resp.text : "";
            if (!text.trim()) push(0);
            else aiItems.push({ id: q.id, qtype, prompt: q.prompt, max_points: max, expected: key, response: text.slice(0, 6000) });
            break;
          }
        }
      }

      if (aiItems.length) {
        // Leaderboard attempts always get AI grading (fairness); practice runs
        // fall back to exact-match checking once the daily limit is used up.
        let aiOk = true;
        let refund: (() => Promise<void>) | null = null;
        try {
          refund = await useQuota(user.id, "grade");
        } catch {
          aiOk = attempt.counts;
        }
        let results: { id: string; points: number; feedback: string }[] = [];
        if (aiOk) {
          try {
            results = await gradeOpenAnswers(aiItems, "");
          } catch (e) {
            console.error("AI grading failed", e);
            await refund?.().catch(() => {});
            if (attempt.counts) {
              throw new HttpError(503, "Google's AI grader is busy right now. Your answers are saved. Wait a minute, then press Submit again.");
            }
            aiOk = false;
          }
        }
        for (const it of aiItems) {
          const r = results.find((x) => x.id === it.id);
          const pts = aiOk && r ? r.points : fallbackPoints(it);
          graded.push({
            question_id: it.id,
            response: answers[it.id] ?? null,
            points: pts,
            is_correct: pts >= it.max_points,
            feedback: aiOk && r?.feedback ? r.feedback : "AI grading wasn't available, so this was checked by exact match only.",
          });
        }
      }

      if (graded.length) {
        const { error } = await admin.from("attempt_answers").upsert(graded.map((g) => ({ attempt_id: attempt.id, ...g })));
        if (error) throw error;
      }

      const score = graded.reduce((s, g) => s + g.points, 0);
      const maxScore = (questions ?? []).reduce((s, q) => s + Number(q.points), 0);
      await admin.from("attempts").update({ status: "graded", score, max_score: maxScore }).eq("id", attempt.id);

      // Require minimal engagement for quizzes to count toward streak credit:
      // must have at least 50% of questions answered to qualify for streak credit
      const answeredCount = Object.values(answers).filter((a) => {
        if (a == null) return false;
        if (typeof a === "object") {
          const obj = a as Record<string, unknown>;
          if (typeof obj.text === "string") return obj.text.trim().length > 0;
          if (Array.isArray(obj.items)) return obj.items.some((it) => String(it).trim().length > 0);
          if (Array.isArray(obj.pairs)) return obj.pairs.some((p) => p != null);
          if (typeof obj.index === "number") return true;
          if (typeof obj.value === "boolean") return true;
        }
        return true;
      }).length;

      const totalQuestions = questions?.length ?? 0;
      const qualifiesForStreak = totalQuestions > 0 && (answeredCount / totalQuestions) >= 0.5;

      let streakSummary = null;
      if (qualifiesForStreak) {
        streakSummary = await recordStudyActivity(user.id, "quiz_completed", 1, score, attempt.id).catch((err) => {
          console.error("Failed to record quiz study activity", err);
          return null;
        });
      }

      return Response.json({ id: attempt.id, status: "graded", score, maxScore, streak: streakSummary });
    } catch (e) {
      // put it back so the student can submit again
      await admin.from("attempts").update({ status: "in_progress", submitted_at: null }).eq("id", attempt.id);
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}

function fallbackPoints(it: GradeItem) {
  if ("accepted" in it.expected) return localTextMatch(it.expected, it.response) ? it.max_points : 0;
  if ("items" in it.expected) {
    const want = new Set(it.expected.items.map(normalize));
    const got = it.response.split("\n").map((l) => normalize(l.replace(/^\d+\.\s*/, "")));
    return Math.min(it.max_points, got.filter((g) => want.delete(g)).length);
  }
  return 0;
}

