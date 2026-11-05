import { z } from "zod";
import { apiMember, errorResponse, HttpError } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { useQuota } from "@/lib/limits";
import { loadNotes } from "@/lib/notes";
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
    const { id: roomId } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, "Check the form and try again.");
    const body = parsed.data;

    const { supabase, user } = await apiMember(roomId);
    const { notes, materialIds } = await loadNotes(supabase, roomId, body.materialIds);
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
        room_id: roomId,
        created_by: user.id,
        title: body.title?.trim() || out.title,
        difficulty: body.difficulty,
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
