"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/layout/NavProgress";
import { play } from "@/utils/sound";
import CorgiLoader from "@/components/mascot/CorgiLoader";
import QuizDoodles from "./QuizDoodles";
import { useFeedback } from "@/components/ui/Feedback";
import { qtypeLabel, type Response } from "@/utils/questions";
import { submitQuizAttempt } from "../services/quizService";
import { emitStreakUpdate } from "@/components/layout/StreakBadge";
import type { TakeQuestion } from "../types";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Timer } from "lucide-react";

type Answers = Record<string, Response>;
const LETTERS = "ABCDEFGHIJ";

function isAnswered(q: TakeQuestion, a: Response | undefined): boolean {
  if (!a) return false;
  if ("index" in a) return a.index != null;
  if ("value" in a) return typeof a.value === "boolean";
  if ("text" in a) return a.text.trim().length > 0;
  if ("items" in a) return a.items.some((s) => s.trim());
  if ("pairs" in a) return a.pairs.some((p) => p != null);
  return false;
}

export default function QuizTaker(props: {
  roomId: string;
  quizId: string;
  attemptId: string;
  title: string;
  ranked: boolean;
  startedAt: string;
  serverNow: string;
  timeLimitMinutes: number | null;
  questions: TakeQuestion[];
}) {
  const { roomId, quizId, attemptId, questions, timeLimitMinutes } = props;
  const router = useRouter();
  const storageKey = `xor-attempt-${attemptId}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [i, setI] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { confirm } = useFeedback();
  const submittedRef = useRef(false);

  // restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  const save = (next: Answers) => {
    setAnswers(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  const setAnswer = (qid: string, a: Response) => save({ ...answers, [qid]: a });

  // timer (corrected for clock difference between phone and server)
  const deadline = useMemo(() => {
    if (!timeLimitMinutes) return null;
    const skew = Date.now() - new Date(props.serverNow).getTime();
    return new Date(props.startedAt).getTime() + skew + timeLimitMinutes * 60_000;
  }, [timeLimitMinutes, props.serverNow, props.startedAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  const remaining = deadline ? Math.max(0, deadline - now) : null;

  // timer sounds: a heads-up at 1 minute left, then a tick each of the last 10 seconds
  const lastSec = useRef<number | null>(null);
  useEffect(() => {
    if (remaining == null) return;
    const sec = Math.ceil(remaining / 1000);
    if (lastSec.current === sec) return;
    const prev = lastSec.current;
    lastSec.current = sec;
    if (prev == null) return; // don't beep on page load
    if (sec === 60) play("warn");
    else if (sec <= 10 && sec > 0) play("tick");
  }, [remaining]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      if (!auto) {
        const missing = questions.filter((q) => !isAnswered(q, answers[q.id])).length;
        if (missing) {
          const ok = await confirm({
            title: `${missing} question${missing > 1 ? "s" : ""} unanswered`,
            body: "Unanswered questions get 0 points. Submit anyway?",
            confirmLabel: "Submit quiz",
            cancelLabel: "Keep answering",
          });
          if (!ok) return;
        }
      }
      submittedRef.current = true;
      play("submit");
      setSubmitting(true);
      setError(null);
      try {
        const res = await submitQuizAttempt(attemptId, answers);
        if (res?.streak) {
          emitStreakUpdate(res.streak);
        }
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        startNavProgress();
        router.replace(`/subjects/${roomId}/quizzes/${quizId}/results/${attemptId}`);
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Couldn't submit.");
      }
    },
    [answers, attemptId, confirm, questions, quizId, roomId, router, storageKey],
  );

  useEffect(() => {
    if (remaining === 0) submit(true);
  }, [remaining, submit]);

  const q = questions[i];
  const answeredCount = questions.filter((x) => isAnswered(x, answers[x.id])).length;

  if (submitting)
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 py-12 text-center">
        <CorgiLoader variant="grading" size={140} />
        <p className="mt-3 text-sm text-ink-soft">Written answers get AI feedback, so this can take a little while.</p>
      </div>
    );

  if (!q) return <p>This quiz has no questions.</p>;

  const mm = remaining != null ? Math.floor(remaining / 60000) : 0;
  const ss = remaining != null ? Math.floor((remaining % 60000) / 1000) : 0;

  const timer =
    remaining != null ? (
      <span
        className={`chip px-3 py-1.5 text-base ${remaining < 60_000 ? "border-coral bg-coral text-white" : "border-sun bg-sun-tint"}`}
        role="timer"
        aria-live={remaining < 60_000 ? "assertive" : "off"}
      >
        <Timer size={16} /> {mm}:{String(ss).padStart(2, "0")}
      </span>
    ) : null;

  const progress = ((i + 1) / questions.length) * 100;
  const isLast = i === questions.length - 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold sm:text-2xl">{props.title}</h2>
          <p className="text-sm font-semibold text-ink-soft">{props.ranked ? "Ranked attempt" : "Practice run"}</p>
        </div>
        <div className="flex items-center gap-2">
          {timer}
          <button className="btn btn-sm" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            <LayoutGrid size={16} /> {answeredCount}/{questions.length} <span className="hidden sm:inline">answered</span>
          </button>
        </div>
      </div>

      {/* all-questions jump list */}
      {showAll && (
        <nav aria-label="Questions" className="card mb-4 flex flex-wrap gap-1.5 p-4">
          {questions.map((x, k) => {
            const done = isAnswered(x, answers[x.id]);
            return (
              <button
                key={x.id}
                onClick={() => {
                  setI(k);
                  setShowAll(false);
                }}
                aria-current={k === i ? "step" : undefined}
                aria-label={`Question ${k + 1}${done ? ", answered" : ""}`}
                className={`grid size-9 place-items-center rounded-xl border-2 text-sm font-bold transition-colors ${
                  k === i ? "border-grape bg-grape text-white" : done ? "border-sun bg-sun-tint" : "border-line bg-white hover:bg-lilac"
                }`}
              >
                {k + 1}
              </button>
            );
          })}
        </nav>
      )}

      {/* the stage */}
      <section className="quiz-stage @container relative overflow-hidden rounded-[20px] bg-[#F7F5FF] shadow-none">
        <div className="h-2 bg-white" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={i + 1} aria-label="Quiz progress">
          <div className="h-full rounded-r-full bg-[#5223BD] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative flex flex-col px-4 pb-6 pt-6 sm:px-8 @[66rem]:min-h-[22rem]">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5223BD]">
              Question {i + 1} of {questions.length}
            </span>
            <p className="mt-1 text-xs font-bold text-ink-soft">
              {qtypeLabel(q.qtype)} · {q.points} pt{Number(q.points) === 1 ? "" : "s"}
            </p>
            <h3 className="mx-auto mt-3 max-w-2xl whitespace-pre-line font-display text-lg sm:text-2xl font-bold leading-snug text-ink">{q.prompt}</h3>
          </div>

          <div className="my-5 border-t border-black/5" />

          <div key={q.id} className="pop mx-auto w-full max-w-xl">
            <QuestionInput q={q} value={answers[q.id]} onChange={(a) => setAnswer(q.id, a)} />
          </div>

          {error && <p className="mx-auto mt-4 w-full max-w-xl rounded-[12px] bg-[#FDE8E8] px-3.5 py-2.5 text-xs font-semibold text-coral">{error}</p>}

          <div className="mx-auto mt-6 flex w-full max-w-xl items-center justify-between gap-3">
            <button className="btn btn-secondary btn-sm shadow-none text-xs" data-sfx="none" onClick={() => { play("next"); setI((k) => Math.max(0, k - 1)); }} disabled={i === 0}>
              <ChevronLeft size={16} /> Back
            </button>
            {!isLast && (
              <button className="btn btn-ghost btn-sm shadow-none text-xs hidden sm:inline-flex" onClick={() => submit(false)}>
                Submit now
              </button>
            )}
            {isLast ? (
              <button className="btn btn-primary btn-sm shadow-none text-xs" onClick={() => submit(false)}>
                Submit quiz
              </button>
            ) : (
              <button className="btn btn-primary btn-sm shadow-none text-xs" data-sfx="none" onClick={() => { play("next"); setI((k) => k + 1); }}>
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
          {!isLast && (
            <div className="mt-3 text-center sm:hidden">
              <button className="btn btn-ghost btn-sm shadow-none text-xs" onClick={() => submit(false)}>
                Submit now
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Pill({
  selected,
  onClick,
  letter,
  children,
  role = "radio",
}: {
  selected: boolean;
  onClick: () => void;
  letter?: React.ReactNode;
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      data-sfx="none"
      onClick={() => {
        play("select");
        onClick();
      }}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left font-semibold transition-all active:scale-[0.98] shadow-none ${
        selected
          ? "bg-[#5223BD] text-white"
          : "bg-white text-ink hover:bg-[#EFE9FF]"
      }`}
    >
      {letter != null && (
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${
            selected ? "bg-white text-[#5223BD]" : "bg-[#F7F5FF] text-[#5223BD]"
          }`}
        >
          {letter}
        </span>
      )}
      <span className="min-w-0 flex-1 text-sm font-semibold">{children}</span>
      {selected && <Check size={16} className="shrink-0" />}
    </button>
  );
}

const fieldCls = "w-full rounded-[10px] border border-line bg-paper px-4 py-2.5 text-base outline-none focus:border-grape focus:ring-2 focus:ring-grape/20 transition";

function QuestionInput({ q, value, onChange }: { q: TakeQuestion; value: Response | undefined; onChange: (a: Response) => void }) {
  switch (q.qtype) {
    case "multiple_choice": {
      const sel = value && "index" in value ? value.index : null;
      return (
        <div className="grid gap-3" role="radiogroup" aria-label="Choices">
          {(q.choices?.options ?? []).map((o, k) => (
            <Pill key={k} selected={sel === k} onClick={() => onChange({ index: k })} letter={LETTERS[k]}>
              {o}
            </Pill>
          ))}
        </div>
      );
    }
    case "true_false": {
      const sel = value && "value" in value ? value.value : null;
      return (
        <div className="grid gap-3" role="radiogroup" aria-label="True or false">
          {[true, false].map((v) => (
            <Pill key={String(v)} selected={sel === v} onClick={() => onChange({ value: v })} letter={v ? "T" : "F"}>
              {v ? "True" : "False"}
            </Pill>
          ))}
        </div>
      );
    }
    case "identification":
    case "fill_blank":
      return (
        <input
          className={fieldCls}
          placeholder="Type your answer"
          value={value && "text" in value ? value.text : ""}
          onChange={(e) => onChange({ text: e.target.value })}
          aria-label="Your answer"
          autoComplete="off"
        />
      );
    case "enumeration": {
      const n = q.choices?.count ?? 3;
      const items = value && "items" in value ? value.items : [];
      return (
        <ol className="grid gap-3">
          {Array.from({ length: n }).map((_, k) => (
            <li key={k} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display text-sm font-bold text-grape">{k + 1}</span>
              <input
                className={fieldCls.replace("text-lg", "text-base")}
                value={items[k] ?? ""}
                aria-label={`Item ${k + 1}`}
                autoComplete="off"
                onChange={(e) => {
                  const next = Array.from({ length: n }, (_, j) => items[j] ?? "");
                  next[k] = e.target.value;
                  onChange({ items: next });
                }}
              />
            </li>
          ))}
        </ol>
      );
    }
    case "matching": {
      const left = q.choices?.left ?? [];
      const right = q.choices?.right ?? [];
      const pairs = value && "pairs" in value ? value.pairs : [];
      return (
        <div className="grid gap-4">
          <ul className="grid gap-1.5 rounded-2xl bg-sun-tint p-4 text-sm font-semibold">
            {right.map((r, k) => (
              <li key={k} className="flex gap-2">
                <span className="font-display font-bold text-grape">{LETTERS[k]}.</span> {r}
              </li>
            ))}
          </ul>
          {left.map((l, k) => (
            <div key={k} className="flex items-center gap-3 rounded-[10px] border border-line bg-paper p-2 pl-4">
              <span className="min-w-0 flex-1 font-bold">{l}</span>
              <select
                className="rounded-[8px] border border-line bg-lilac px-3 py-2 font-bold outline-none focus:border-grape"
                aria-label={`Match for ${l}`}
                value={pairs[k] ?? ""}
                onChange={(e) => {
                  const next = Array.from({ length: left.length }, (_, j) => pairs[j] ?? null);
                  next[k] = e.target.value === "" ? null : Number(e.target.value);
                  play("select");
                  onChange({ pairs: next });
                }}
              >
                <option value="">Pick…</option>
                {right.map((_, j) => (
                  <option key={j} value={j}>
                    {LETTERS[j]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    case "scenario":
    case "essay":
      return (
        <div>
          <textarea
            className={`${fieldCls} min-h-56 text-base leading-relaxed`}
            placeholder="Write your answer…"
            value={value && "text" in value ? value.text : ""}
            onChange={(e) => onChange({ text: e.target.value })}
            maxLength={6000}
            aria-label="Your answer"
          />
          <p className="mt-2 text-center text-xs text-ink-soft">Graded by AI against a model answer. Partial credit is possible.</p>
        </div>
      );
    default:
      return null;
  }
}

