import { z } from "zod";
import { apiSubjectMember, errorResponse, HttpError } from "@/services/authService";
import { createAdmin } from "@/lib/supabase/server";
import { useQuota } from "@/services/limitService";
import { loadNotes } from "@/services/noteService";
import { generateFlashcards } from "@/lib/ai/gemini";

export const maxDuration = 300;

const Body = z.object({
  materialIds: z.array(z.string().uuid()).min(1).max(10),
  count: z.number().int().min(5).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
  instructions: z.string().max(600).optional(),
  title: z.string().max(80).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: subjectId } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Check the form and try again.");
    const body = parsed.data;

    const { supabase, user } = await apiSubjectMember(subjectId, { requireEdit: true });
    const { notes, materialIds } = await loadNotes(supabase, subjectId, body.materialIds);
    const refund = await useQuota(user.id, "generate");

    let out;
    try {
      out = await generateFlashcards(notes, body.count, body.difficulty, body.instructions?.trim() || undefined);
    } catch (e) {
      await refund().catch(() => {});
      throw e;
    }

    const admin = createAdmin();
    const { data: deck, error } = await admin
      .from("decks")
      .insert({
        subject_id: subjectId,
        created_by: user.id,
        title: body.title?.trim() || out.title,
        difficulty: body.difficulty,
        source_type: "ai",
        material_ids: materialIds,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: cardErr } = await admin
      .from("cards")
      .insert(out.cards.map((c, i) => ({ deck_id: deck.id, position: i, front: c.front, back: c.back })));
    if (cardErr) {
      await admin.from("decks").delete().eq("id", deck.id);
      throw cardErr;
    }
    return Response.json({ id: deck.id });
  } catch (e) {
    return errorResponse(e);
  }
}

