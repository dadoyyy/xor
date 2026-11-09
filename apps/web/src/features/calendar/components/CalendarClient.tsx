"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Inbox,
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  Trash2,
  Edit2,
  AlertCircle,
  Filter,
} from "lucide-react";
import type { CalendarEvent, CalendarEventType, CalendarEventStatus } from "@/types/subject";
import type { LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import EventModal from "./EventModal";

const TYPE_COLORS: Record<CalendarEventType, { badge: string; dot: string; text: string }> = {
  assignment: { badge: "bg-grape-tint border-grape text-grape", dot: "bg-grape", text: "text-grape" },
  project: { badge: "bg-sky border-line text-ink", dot: "bg-blue-500", text: "text-ink" },
  exam: { badge: "bg-coral-tint border-coral text-coral", dot: "bg-coral", text: "text-coral" },
  backlog: { badge: "bg-sun-tint border-sun text-ink", dot: "bg-sun", text: "text-ink" },
};

export default function CalendarClient({
  initialEvents,
  subjects,
  userTimezone,
}: {
  initialEvents: CalendarEvent[];
  subjects: LibrarySubjectItem[];
  userTimezone: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [activeTab, setActiveTab] = useState<"month" | "agenda" | "backlog">("month");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | null>(null);

  // Subject lookup map
  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [subjects]);

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (subjectFilter !== "all" && e.subject_id !== subjectFilter) return false;
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (statusFilter === "pending" && e.status === "done") return false;
      if (statusFilter === "done" && e.status !== "done") return false;
      return true;
    });
  }, [events, subjectFilter, typeFilter, statusFilter]);

  // Toggle Done state
  async function handleToggleDone(event: CalendarEvent) {
    const newStatus: CalendarEventStatus = event.status === "done" ? "todo" : "done";
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              status: newStatus,
              completed_at: newStatus === "done" ? new Date().toISOString() : null,
            }
          : e,
      ),
    );

    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch {
      // Revert on error
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    }
  }

  // Delete event
  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    try {
      const res = await fetch(`/api/calendar/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
    } catch {
      alert("Failed to delete event. Please refresh.");
    }
  }

  function handleOpenCreate(dateStr?: string) {
    setEditingEvent(null);
    setSelectedDateForNew(dateStr ?? null);
    setShowModal(true);
  }

  function handleOpenEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setSelectedDateForNew(null);
    setShowModal(true);
  }

  function handleSaveEvent(saved: CalendarEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d });
    }
    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <CalendarIcon size={28} className="text-grape" /> Academic Calendar & Planner
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Schedule project milestones, assignments, exams, and undated backlogs in your local timezone ({userTimezone}).
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="btn btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Tabs & Filters Toolbar */}
      <div className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* View Switcher Tabs */}
        <div className="flex rounded-full border border-line bg-paper/80 p-0.5">
          <button
            onClick={() => setActiveTab("month")}
            className={`btn btn-sm flex items-center gap-1.5 rounded-full border-0 font-display ${
              activeTab === "month" ? "bg-lilac text-grape" : "bg-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <CalendarIcon size={16} /> Month
          </button>
          <button
            onClick={() => setActiveTab("agenda")}
            className={`btn btn-sm flex items-center gap-1.5 rounded-full border-0 font-display ${
              activeTab === "agenda" ? "bg-lilac text-grape" : "bg-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <List size={16} /> Agenda
          </button>
          <button
            onClick={() => setActiveTab("backlog")}
            className={`btn btn-sm flex items-center gap-1.5 rounded-full border-0 font-display ${
              activeTab === "backlog" ? "bg-lilac text-grape" : "bg-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <Inbox size={16} /> Backlog
            {events.filter((e) => !e.due_date || e.event_type === "backlog").length > 0 && (
              <span className="ml-1 rounded-full bg-sun px-1.5 py-0.2 text-[10px] font-bold text-ink">
                {events.filter((e) => !e.due_date || e.event_type === "backlog").length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="input input-sm text-xs"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input input-sm text-xs"
          >
            <option value="all">All Types</option>
            <option value="assignment">Assignments</option>
            <option value="project">Projects</option>
            <option value="exam">Exams</option>
            <option value="backlog">Backlogs</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input input-sm text-xs"
          >
            <option value="all">All Status</option>
            <option value="pending">To Do / In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>
      </div>

      {/* View Content */}
      {activeTab === "month" && (
        <div className="card p-4 sm:p-6 space-y-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              {monthName} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="btn btn-secondary btn-sm p-1.5"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="btn btn-ghost btn-sm text-xs font-bold"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="btn btn-secondary btn-sm p-1.5"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-display text-xs font-bold text-ink-soft py-1 border-b-2 border-line"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((cd, index) => {
              if (!cd.dateStr || !cd.dayNum) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-20 sm:min-h-28 rounded-xl bg-lilac/20 border border-transparent"
                  />
                );
              }

              const isToday = cd.dateStr === todayStr;
              const dayEvents = filteredEvents.filter((e) => e.due_date === cd.dateStr);

              return (
                <div
                  key={cd.dateStr}
                  onClick={() => handleOpenCreate(cd.dateStr!)}
                  className={`group relative min-h-20 sm:min-h-28 rounded-[10px] border p-1.5 transition cursor-pointer flex flex-col justify-between hover:border-grape hover:bg-lilac/30 ${
                    isToday
                      ? "border-grape bg-lilac/40"
                      : "border-line bg-paper/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-display text-xs font-bold rounded-full size-6 flex items-center justify-center ${
                        isToday ? "bg-grape text-paper" : "text-ink"
                      }`}
                    >
                      {cd.dayNum}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreate(cd.dateStr!);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition rounded-md p-0.5 hover:bg-lilac text-ink-soft"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Day Events List */}
                  <div className="space-y-1 mt-1 max-h-16 sm:max-h-20 overflow-y-auto pr-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const colors = TYPE_COLORS[ev.event_type] || TYPE_COLORS.assignment;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(ev);
                          }}
                          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border truncate transition hover:scale-[1.02] ${
                            ev.status === "done"
                              ? "border-line bg-paper/60 text-ink-soft line-through opacity-70"
                              : colors.badge
                          }`}
                          title={`${ev.title} (${ev.event_type})`}
                        >
                          <span className={`size-1.5 shrink-0 rounded-full ${colors.dot}`} />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="block text-[10px] font-bold text-ink-soft text-center">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda List View */}
      {activeTab === "agenda" && (
        <div className="card p-6 space-y-6">
          <h2 className="font-display text-xl font-bold">Upcoming Agenda</h2>
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Image
                src={CORGI_ASSETS["empty-state"].src}
                alt={CORGI_ASSETS["empty-state"].alt}
                width={120}
                height={120}
                className="h-28 w-28 object-contain motion-reduce:animate-none mb-3"
              />
              <p className="font-display text-lg font-bold">No events found</p>
              <p className="text-xs text-ink-soft mt-1">
                You have no scheduled tasks or deadlines matching the current filter.
              </p>
              <button
                onClick={() => handleOpenCreate()}
                className="btn btn-primary mt-4 btn-sm"
              >
                <Plus size={16} /> Add First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const colors = TYPE_COLORS[ev.event_type] || TYPE_COLORS.assignment;
                const isOverdue = ev.due_date && ev.due_date < todayStr && ev.status !== "done";

                return (
                  <div
                    key={ev.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border-2 transition ${
                      ev.status === "done"
                        ? "border-line bg-paper/50 opacity-60"
                        : isOverdue
                          ? "border-coral/50 bg-coral-tint/30"
                          : "border-line bg-paper hover:border-grape"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleDone(ev)}
                        className="mt-0.5 text-ink-soft hover:text-grape transition shrink-0"
                        title={ev.status === "done" ? "Mark as to-do" : "Mark as done"}
                      >
                        {ev.status === "done" ? (
                          <CheckCircle2 size={20} className="text-mint fill-mint/20" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`chip text-[10px] font-bold uppercase ${colors.badge}`}
                          >
                            {ev.event_type}
                          </span>
                          {ev.priority === "high" && (
                            <span className="chip border-coral bg-coral-tint text-[10px] font-bold text-coral">
                              High Priority
                            </span>
                          )}
                          {ev.subject_id && subjectMap.has(ev.subject_id) && (
                            <span className="chip border-line bg-lilac/40 text-[10px] font-bold text-grape">
                              {subjectMap.get(ev.subject_id)}
                            </span>
                          )}
                        </div>

                        <p
                          className={`font-display text-base font-bold ${
                            ev.status === "done" ? "line-through text-ink-soft" : "text-ink"
                          }`}
                        >
                          {ev.title}
                        </p>

                        {ev.description && (
                          <p className="text-xs text-ink-soft max-w-xl line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <CalendarIcon size={14} className="text-ink-soft" />
                          <span className={isOverdue ? "text-coral font-bold" : "text-ink"}>
                            {ev.due_date || "Undated"}
                          </span>
                        </div>
                        {ev.due_time && (
                          <div className="flex items-center gap-1 text-[11px] text-ink-soft">
                            <Clock size={12} />
                            <span>{ev.due_time.slice(0, 5)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(ev)}
                          className="btn btn-ghost btn-sm p-1.5"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="btn btn-ghost btn-sm p-1.5 text-coral hover:bg-coral-tint"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Backlog View (Undated or backlog-typed tasks) */}
      {activeTab === "backlog" && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Study Backlog</h2>
              <p className="text-xs text-ink-soft">
                Undated study items, revision topics, and tasks to schedule later.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingEvent(null);
                setSelectedDateForNew(null);
                setShowModal(true);
              }}
              className="btn btn-sun btn-sm flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Backlog Item
            </button>
          </div>

          {events.filter((e) => !e.due_date || e.event_type === "backlog").length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Image
                src={CORGI_ASSETS["welcome"].src}
                alt={CORGI_ASSETS["welcome"].alt}
                width={120}
                height={120}
                className="h-28 w-28 object-contain motion-reduce:animate-none mb-3"
              />
              <p className="font-display text-lg font-bold">Your backlog is clean!</p>
              <p className="text-xs text-ink-soft mt-1">
                Got a study topic you want to tackle later? Add it to your backlog without setting a date.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter((e) => !e.due_date || e.event_type === "backlog")
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border-2 border-line bg-paper hover:border-grape transition"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleDone(ev)}
                        className="mt-0.5 text-ink-soft hover:text-grape transition shrink-0"
                      >
                        {ev.status === "done" ? (
                          <CheckCircle2 size={20} className="text-mint fill-mint/20" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="chip border-sun bg-sun-tint text-[10px] font-bold text-ink">
                            Backlog
                          </span>
                          {ev.subject_id && subjectMap.has(ev.subject_id) && (
                            <span className="chip border-line bg-lilac/40 text-[10px] font-bold text-grape">
                              {subjectMap.get(ev.subject_id)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`font-display text-base font-bold ${
                            ev.status === "done" ? "line-through text-ink-soft" : "text-ink"
                          }`}
                        >
                          {ev.title}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-ink-soft line-clamp-1">{ev.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenEdit(ev)}
                        className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                      >
                        <CalendarIcon size={14} /> Schedule Due Date
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="btn btn-ghost btn-sm p-1.5 text-coral hover:bg-coral-tint"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Event Add/Edit Modal */}
      {showModal && (
        <EventModal
          event={editingEvent}
          initialDate={selectedDateForNew}
          subjects={subjects}
          onClose={() => setShowModal(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}

