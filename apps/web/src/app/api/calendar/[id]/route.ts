import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/services/calendarService";
import { errorResponse, HttpError } from "@/services/authService";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) throw new HttpError(401, "Sign in first.");

    const body = await req.json().catch(() => ({}));
    const event = await updateCalendarEvent(user.id, id, {
      title: body.title,
      description: body.description,
      event_type: body.event_type,
      priority: body.priority,
      subject_id: body.subject_id,
      due_date: body.due_date,
      due_time: body.due_time,
      status: body.status,
    });

    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) throw new HttpError(401, "Sign in first.");

    await deleteCalendarEvent(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

