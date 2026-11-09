import Link from "next/link";
import { CheckCircle2, Clock, FileQuestion, ArrowRight } from "lucide-react";
import type { RecentAttemptItem } from "@/services/progressService";

export default function RecentAttemptsList({ attempts }: { attempts: RecentAttemptItem[] }) {
  if (attempts.length === 0) {
    return (
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">Recent Quiz Attempts</h2>
        <div className="py-8 text-center text-xs text-ink-soft">
          No quiz attempts on record yet. Select a subject to take your first quiz!
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between border-b-2 border-line pb-4">
        <div className="flex items-center gap-2.5">
          <FileQuestion size={22} className="text-grape shrink-0" />
          <div>
            <h2 className="font-display text-lg font-bold">Recent Quiz Attempts</h2>
            <p className="text-xs text-ink-soft">Your latest 10 study quiz sessions and graded results.</p>
          </div>
        </div>
        <span className="chip border-line bg-paper text-xs font-bold">
          {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
        </span>
      </div>

      <div className="mt-4 divide-y divide-line/60">
        {attempts.map((attempt) => {
          const isGraded = attempt.status === "graded";
          const percent = attempt.percentage;
          const scorePillClass =
            percent != null
              ? percent >= 90
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : percent >= 70
                  ? "bg-grape-tint text-grape border-grape/30"
                  : "bg-coral/10 text-coral border-coral/30"
              : "bg-paper text-ink-soft border-line";

          const formattedDate = new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={attempt.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 transition-colors hover:bg-lilac/10 rounded-xl px-2"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-ink">{attempt.quizTitle}</span>
                  <span className="chip border-line bg-paper text-[11px] font-semibold text-ink-soft">
                    {attempt.subjectName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-soft">
                  <Clock size={12} />
                  <span>{formattedDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className={`chip border px-3 py-1 font-display text-xs font-bold ${scorePillClass}`}>
                  {attempt.score != null && attempt.maxScore != null ? (
                    <span>
                      {attempt.score}/{attempt.maxScore} pts ({percent}%)
                    </span>
                  ) : (
                    <span className="capitalize">{attempt.status}</span>
                  )}
                </div>

                {isGraded && attempt.subjectId && attempt.quizId && (
                  <Link
                    href={`/subjects/${attempt.subjectId}/quizzes/${attempt.quizId}/results/${attempt.id}`}
                    className="btn btn-secondary btn-sm text-xs font-bold flex items-center gap-1"
                  >
                    <span>Results</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

