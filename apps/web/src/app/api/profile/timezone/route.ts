import { z } from "zod";
import { errorResponse, HttpError } from "@/services/authService";
import { getStreakSummary } from "@/services/activityService";
import { isValidIanaTimezone } from "@/utils/timezone";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  timezone: z.string().trim().min(1).max(64),
});

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "Invalid timezone.");
    const { timezone } = parsed.data;

    if (!isValidIanaTimezone(timezone)) {
      throw new HttpError(400, "Invalid IANA timezone.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new HttpError(401, "Sign in first.");

    const { data: updated, error } = await supabase.rpc("set_my_timezone", { p_timezone: timezone });
    if (error) throw new HttpError(400, error.message || "Invalid IANA timezone.");

    const streak = await getStreakSummary(user.id);
    return Response.json({
      ok: true,
      updated: Boolean(updated),
      ...streak,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
