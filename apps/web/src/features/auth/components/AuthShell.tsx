import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Mascot, { Logo } from "@/components/ui/Mascot";
import type { Mood } from "@/components/ui/Mascot";
import type { SignupCorgiState } from "@/lib/mascot/signup";

const LEFT_PANE_FEATURES: Array<{
  title: string;
  body: string;
  mood: Mood;
  accent: string;
}> = [
  {
    title: "PDFs & Formatted Text Import",
    body: "Upload lecture slides or paste Q&A flashcards, Multiple Choice, and Fill-in-the-Blank sets.",
    mood: "upload-pdf",
    accent: "border-grape",
  },
  {
    title: "Mixed Quizzes & Instant Grading",
    body: "Practice Multiple Choice and Fill-in-the-Blank items together with auto-verified answers.",
    mood: "quiz-time",
    accent: "border-sun-deep",
  },
  {
    title: "Personal Calendar & Backlogs",
    body: "Keep project milestones, study backlogs, and assignment due dates on one schedule.",
    mood: "thinking",
    accent: "border-grape",
  },
  {
    title: "GitHub-Style Monthly Streaks",
    body: "Light up your daily activity grid, climb room leaderboards, and earn Corgi badges.",
    mood: "streak-7",
    accent: "border-sun-deep",
  },
];

/** Full-screen split layout for sign-in / sign-up pages: fits within 100dvh with zero scrolling on desktop. */
export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
  mood?: Mood;
  corgiState?: SignupCorgiState;
}) {
  return (
    <div className="grid min-h-dvh bg-sky text-ink lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:overflow-hidden">
      {/* Left Pane (Desktop): Interactive Standing Corgi + Cartoon Information Panel */}
      <aside className="relative hidden overflow-hidden border-r-2 border-line bg-lilac lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-9 xl:px-16 xl:py-11">
        {/* Decorative soft pastel circles */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-sun-tint"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-grape-tint"
        />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" aria-label="xor home">
            <Logo size={38} />
          </Link>
        </div>

        {/* Center Headline + 4 Concise Feature Items */}
        <div className="relative z-10 my-auto max-w-lg">
          <h1 className="font-display text-4xl font-bold leading-[1.06] text-ink xl:text-5xl">
            Study smarter,
            <br />
            <span className="text-grape">one streak</span> at a time.
          </h1>

          <div className="mt-6 space-y-3.5">
            {LEFT_PANE_FEATURES.map((item) => (
              <div
                key={item.title}
                className={`flex items-center gap-3.5 border-l-4 ${item.accent} pl-3.5`}
              >
                <div className="shrink-0 rounded-xl border-2 border-line bg-paper p-1">
                  <Mascot mood={item.mood} size={34} withBackdrop={false} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-ink xl:text-base">
                    {item.title}
                  </h2>
                  <p className="text-xs leading-snug text-ink-soft xl:text-sm">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimal Spacer for Visual Balance */}
        <div className="relative z-10 text-xs font-semibold text-ink-soft">
          Private subjects · Smart imports · Personal planner
        </div>
      </aside>

      {/* Right Pane: Centered Auth Card Panel */}
      <main className="flex min-h-dvh flex-col justify-center bg-paper px-4 py-6 sm:px-8 lg:h-dvh lg:min-h-0 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:text-grape"
            >
              <ArrowLeft size={16} /> Back to home
            </Link>
            <Link href="/" aria-label="xor home" className="lg:hidden">
              <Logo size={34} />
            </Link>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
