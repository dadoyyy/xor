"use client";

import { useState } from "react";
import { X, Calendar, Clock, AlertCircle } from "lucide-react";
import type { CalendarEvent, CalendarEventPriority, CalendarEventType } from "@/types/subject";
import type { LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";

export default function EventModal({
  event,
  initialDate,
  subjects,
  onClose,
  onSave,
}: {
  event?: CalendarEvent | null;
  initialDate?: string | null;
  subjects: LibrarySubjectItem[];
  onClose: () => void;
  onSave: (saved: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventType, setEventType] = useState<CalendarEventType>(event?.event_type ?? "assignment");
  const [priority, setPriority] = useState<CalendarEventPriority>(event?.priority ?? "medium");
  const [subjectId, setSubjectId] = useState<string>(event?.subject_id ?? "");
  const [dueDate, setDueDate] = useState<string>(event?.due_date ?? initialDate ?? "");
  const [dueTime, setDueTime] = useState<string>(event?.due_time ? event.due_time.slice(0, 5) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter an event title.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        priority,
        subject_id: subjectId || null,
        due_date: dueDate || null,
        due_time: dueTime || null,
      };

      const res = await fetch(event ? `/api/calendar/${event.id}` : "/api/calendar", {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save calendar event.");
      }

      onSave(data.event);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
      <div className="card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-line pb-3">
          <h2 className="font-display text-xl font-bold">
            {event ? "Edit Event" : "Add Calendar Event"}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border-2 border-coral bg-coral-tint p-3 text-xs font-semibold text-coral">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="event-title">
              Title <span className="text-coral">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Exam, Biology Lab Report"
              className="input font-semibold"
              autoFocus
            />
            <span className="text-[11px] text-ink-soft">{title.length}/120 characters</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="input text-sm capitalize"
              >
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="exam">Exam</option>
                <option value="backlog">Backlog</option>
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CalendarEventPriority)}
                className="input text-sm capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Link to Subject (Optional)</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="input text-sm"
            >
              <option value="">No subject linked</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="due-date">
                Due Date
              </label>
              <div className="relative">
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <span className="text-[11px] text-ink-soft">Leave blank for Backlog</span>
            </div>

            <div>
              <label className="label" htmlFor="due-time">
                Time (Optional)
              </label>
              <div className="relative">
                <input
                  id="due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="event-description">
              Description (Optional)
            </label>
            <textarea
              id="event-description"
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key notes, grading rubric, or study links..."
              className="input text-sm"
            />
            <span className="text-[11px] text-ink-soft">{description.length}/500 characters</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn btn-primary"
            >
              {submitting ? "Saving…" : event ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

