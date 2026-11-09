import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listUserCalendarEvents,
  createCalendarEvent,
} from "@/services/calendarService";
import { errorResponse, HttpError } from "@/services/authService";
import type { CalendarEventStatus } from "@/types/subject";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) throw new HttpError(401, "Sign in first.");

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const status = (searchParams.get("status") as CalendarEventStatus) || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;

    const events = await listUserCalendarEvents(user.id, {
      month,
      status,
      subjectId,
    });

    return NextResponse.json({ events });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) throw new HttpError(401, "Sign in first.");

    const body = await req.json().catch(() => ({}));
    const event = await createCalendarEvent(user.id, {
      title: body.title,
      description: body.description,
      event_type: body.event_type,
      priority: body.priority,
      subject_id: body.subject_id,
      due_date: body.due_date,
      due_time: body.due_time,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

