import "server-only";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { HttpError } from "@/services/authService";
import type { CalendarEvent, CalendarEventPriority, CalendarEventStatus, CalendarEventType } from "@/types/subject";

export const MAX_CALENDAR_EVENTS_PER_USER = 500;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 500;

export type CreateCalendarEventInput = {
  title: string;
  description?: string | null;
  event_type: CalendarEventType;
  priority?: CalendarEventPriority;
  subject_id?: string | null;
  due_date?: string | null; // "YYYY-MM-DD"
  due_time?: string | null; // "HH:MM"
};

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput> & {
  status?: CalendarEventStatus;
};

export async function listUserCalendarEvents(
  userId: string,
  options?: {
    month?: string; // "YYYY-MM"
    status?: CalendarEventStatus;
    subjectId?: string;
  },
): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.subjectId) {
    query = query.eq("subject_id", options.subjectId);
  }
  if (options?.month) {
    // Range query for month YYYY-MM
    const [yearStr, monthStr] = options.month.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonthYear = month === 12 ? year + 1 : year;
      const nextMonthNum = month === 12 ? 1 : month + 1;
      const endDate = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-01`;
      query = query.gte("due_date", startDate).lt("due_date", endDate);
    }
  }

  const { data, error } = await query;
  if (error) {
    // If table doesn't exist yet on remote schema, fail gracefully with empty array
    if (error.code === "42P01") return [];
    throw new HttpError(500, error.message);
  }
  return (data as CalendarEvent[]) ?? [];
}

export async function createCalendarEvent(
  userId: string,
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const title = (input.title ?? "").trim();
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Event title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
  }

  const description = input.description ? input.description.trim() : null;
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new HttpError(400, `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`);
  }

  const validTypes: CalendarEventType[] = ["assignment", "project", "backlog", "exam"];
  if (!validTypes.includes(input.event_type)) {
    throw new HttpError(400, "Invalid event type.");
  }

  const supabase = await createClient();

  // Enforce max events limit per user
  const { count, error: countErr } = await supabase
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!countErr && (count ?? 0) >= MAX_CALENDAR_EVENTS_PER_USER) {
    throw new HttpError(
      400,
      `You've reached the maximum limit of ${MAX_CALENDAR_EVENTS_PER_USER} calendar events. Please archive or delete older events.`,
    );
  }

  // Validate subject access if linked to a subject
  if (input.subject_id) {
    const { data: member, error: memErr } = await supabase
      .from("library_entries")
      .select("subject_id")
      .eq("subject_id", input.subject_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr) {
      throw new HttpError(500, `Failed to verify subject membership: ${memErr.message}`);
    }
    if (!member) {
      throw new HttpError(403, "You do not have access to the selected subject.");
    }
  }

  // Validate plain date format YYYY-MM-DD
  const dueDate = input.due_date ? input.due_date.trim() : null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new HttpError(400, "Due date must be formatted as YYYY-MM-DD.");
  }

  // Validate time format HH:MM
  let dueTime = input.due_time ? input.due_time.trim() : null;
  if (dueTime) {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(dueTime)) {
      throw new HttpError(400, "Due time must be formatted as HH:MM.");
    }
    if (dueTime.length === 5) dueTime += ":00";
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: userId,
      subject_id: input.subject_id ?? null,
      title,
      description,
      event_type: input.event_type,
      priority: input.priority ?? "medium",
      due_date: dueDate,
      due_time: dueTime,
      status: "todo",
    })
    .select()
    .single();

  if (error || !data) {
    throw new HttpError(500, error?.message || "Failed to create calendar event.");
  }
  return data as CalendarEvent;
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const supabase = await createClient();

  // Validate ownership
  const { data: existing, error: readErr } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr || !existing) {
    throw new HttpError(404, "Calendar event not found.");
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      throw new HttpError(400, `Event title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
    }
    updates.title = title;
  }

  if (input.description !== undefined) {
    const description = input.description ? input.description.trim() : null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new HttpError(400, `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`);
    }
    updates.description = description;
  }

  if (input.event_type !== undefined) {
    const validTypes: CalendarEventType[] = ["assignment", "project", "backlog", "exam"];
    if (!validTypes.includes(input.event_type)) {
      throw new HttpError(400, "Invalid event type.");
    }
    updates.event_type = input.event_type;
  }

  if (input.priority !== undefined) {
    updates.priority = input.priority;
  }

  if (input.subject_id !== undefined) {
    if (input.subject_id) {
      const { data: member } = await supabase
        .from("library_entries")
        .select("subject_id")
        .eq("subject_id", input.subject_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!member) throw new HttpError(403, "You do not have access to the selected subject.");
    }
    updates.subject_id = input.subject_id;
  }

  if (input.due_date !== undefined) {
    const dueDate = input.due_date ? input.due_date.trim() : null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new HttpError(400, "Due date must be formatted as YYYY-MM-DD.");
    }
    updates.due_date = dueDate;
  }

  if (input.due_time !== undefined) {
    let dueTime = input.due_time ? input.due_time.trim() : null;
    if (dueTime) {
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(dueTime)) {
        throw new HttpError(400, "Due time must be formatted as HH:MM.");
      }
      if (dueTime.length === 5) dueTime += ":00";
    }
    updates.due_time = dueTime;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === "done" && existing.status !== "done") {
      updates.completed_at = new Date().toISOString();
      // NOTE: Completing calendar events MUST NOT count toward the streak.
      // We explicitly DO NOT call recordStudyActivity here.
    } else if (input.status !== "done") {
      updates.completed_at = null;
    }
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", eventId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw new HttpError(500, error?.message || "Failed to update calendar event.");
  }
  return data as CalendarEvent;
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) throw new HttpError(500, error.message);
}

