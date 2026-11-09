import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import Mascot, { Logo } from "@/components/ui/Mascot";
import LandingSections from "@/components/landing/LandingSections";
import { createClient } from "@/lib/supabase/server";
import { KeyRound } from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <div className="min-h-dvh overflow-x-clip bg-sky text-ink">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-md">
        <nav className="page-x mx-auto flex h-16 max-w-7xl items-center justify-between sm:h-20">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="xor home">
              <Logo size={40} />
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <a href="#how-it-works" className="btn btn-ghost btn-sm">
                How It Works
              </a>
              <a href="#smart-import" className="btn btn-ghost btn-sm">
                Smart Import
              </a>
              <a href="#calendar-planner" className="btn btn-ghost btn-sm">
                Calendar
              </a>
              <a href="#study-streaks" className="btn btn-ghost btn-sm">
                Streaks &amp; Badges
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="page-x mx-auto flex max-w-7xl items-center py-12 md:py-16 lg:min-h-[calc(100dvh-5rem)]">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-16">
          {/* Left Hero Copy (Clean & Focused) */}
          <div>
            <h1 className="text-5xl font-bold leading-[1.03] sm:text-6xl xl:text-7xl">
              Study together.
              <br />
              <span className="text-grape">Stay on streak</span> every day.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft xl:text-xl">
              Drop in lecture PDFs or formatted{" "}
              <strong className="font-bold text-ink">
                Q&amp;A, Multiple Choice, and Fill-in-the-Blank text
              </strong>{" "}
              to generate flashcards and quizzes for your subjects—while tracking deadlines and your daily study streak.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary text-base sm:text-lg">
                Create your first subject
              </Link>
              <Link href="/login" className="btn btn-sun text-base sm:text-lg">
                <KeyRound size={18} /> I have an invite key
              </Link>
            </div>
          </div>

          {/* Right Hero Visual: Corgi Study Squad Asset with Pastel Circle Accents */}
          <div className="relative mx-auto flex w-full max-w-xl items-center justify-center p-6 sm:p-10 lg:max-w-none">
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 top-2 size-60 rounded-full bg-sun-tint sm:right-6 sm:top-4 sm:size-72"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-2 size-52 rounded-full bg-grape-tint sm:bottom-4 sm:left-6 sm:size-64"
            />
            <Image
              src={CORGI_ASSETS["hero-squad"].src}
              alt={CORGI_ASSETS["hero-squad"].alt}
              width={897}
              height={669}
              sizes="(max-width: 768px) 100vw, 540px"
              priority
              className="corgi-float relative z-10 h-auto w-full max-w-[540px] select-none object-contain"
              draggable={false}
            />
          </div>
        </div>
      </section>

      {/* 4-Step Corgi Overview Strip ("How It Works") */}
      <section id="how-it-works" className="border-y-2 border-line bg-lilac py-14 lg:py-16 scroll-mt-20">
        <div className="page-x mx-auto max-w-7xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">How xor works</h2>
            <p className="mt-1.5 text-base text-ink-soft">
              Four simple steps from raw class notes to a daily study habit.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                mood: "welcome" as const,
                step: "01",
                title: "Join a Private Subject",
                body: "Create a subject or enter an invite key to share study sets and leaderboards with friends.",
              },
              {
                mood: "upload-pdf" as const,
                step: "02",
                title: "Import PDFs or Text",
                body: "Upload lecture slides or paste formatted Q&A, Multiple Choice, and Fill-in-the-Blank sets.",
              },
              {
                mood: "flashcards" as const,
                step: "03",
                title: "Schedule Deadlines",
                body: "Keep projects, study backlogs, and assignment due dates organized on your personal calendar.",
              },
              {
                mood: "quiz-time" as const,
                step: "04",
                title: "Build Your Streak",
                body: "Complete quizzes and decks daily to light up your monthly grid and unlock Corgi badges.",
              },
            ].map((item) => (
              <div key={item.step} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="chip border-sun bg-sun-tint text-ink">Step {item.step}</span>
                  <Mascot mood={item.mood} size={68} />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm leading-snug text-ink-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Deep-Dive Sections: Smart Import, Academic Calendar, Monthly Streaks & Badges */}
      <div className="py-16 lg:py-20">
        <LandingSections />
      </div>

      {/* Bottom CTA Banner */}
      <section className="page-x mx-auto max-w-7xl pb-16">
        <div className="card relative overflow-hidden bg-lilac p-8 sm:p-10">
          <div className="relative z-10 flex flex-col items-center justify-between gap-6 lg:flex-row">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <Mascot mood="cheering" size={92} className="bob" />
              <div className="max-w-lg">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Ready to start your study streak?
                </h2>
                <p className="mt-1 text-base text-ink-soft">
                  Create your free account in seconds and invite your study group with an invite key.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-primary text-base">
                Get started free
              </Link>
              <Link href="/login" className="btn btn-sun text-base">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-line bg-paper py-8">
        <div className="page-x mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={32} />
          <div className="flex items-center gap-5 text-sm font-semibold text-ink-soft">
            <a href="#how-it-works" className="hover:text-grape">
              How It Works
            </a>
            <a href="#smart-import" className="hover:text-grape">
              Smart Import
            </a>
            <a href="#calendar-planner" className="hover:text-grape">
              Calendar
            </a>
            <a href="#study-streaks" className="hover:text-grape">
              Streaks
            </a>
            <Link href="/login" className="hover:text-grape">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
