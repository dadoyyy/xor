import { z } from "zod";
import { apiSubjectMember, errorResponse, HttpError } from "@/services/authService";
import { recordDeckCardReviews } from "@/services/activityService";
import { useQuota } from "@/services/limitService";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let refundQuota: (() => Promise<void>) | null = null;
  try {
    const { id: deckId } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HttpError(400, "Provide between 1 and 100 valid card IDs.");
    }
    const distinctCardIds = Array.from(new Set(parsed.data.cardIds));

    const supabase = await createClient();
    const { data: deck } = await supabase
      .from("decks")
      .select("id, subject_id")
      .eq("id", deckId)
      .maybeSingle();
    if (!deck) throw new HttpError(404, "Deck not found.");

    const { user } = await apiSubjectMember(deck.subject_id);
    refundQuota = await useQuota(user.id, "review");

    // Verify cards belong to this deck
    const { count, error: cardErr } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .in("id", distinctCardIds);
    if (cardErr || count !== distinctCardIds.length) {
      throw new HttpError(400, "One or more card IDs do not belong to this deck.");
    }

    const result = await recordDeckCardReviews(supabase, user.id, deckId, distinctCardIds);

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    if (refundQuota) {
      await refundQuota().catch(() => {});
    }
    return errorResponse(e);
  }
}
