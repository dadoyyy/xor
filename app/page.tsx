import Link from "next/link";
import { redirect } from "next/navigation";
import Mascot, { Logo } from "@/components/Mascot";
import { createClient } from "@/lib/supabase/server";
import { FileText, KeyRound, Layers, Trophy } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/rooms");

  return (
    <div className="min-h-dvh overflow-x-clip bg-white">
      <nav className="page-x flex h-16 items-center justify-between sm:h-20">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up free
          </Link>
        </div>
      </nav>

      <section className="page-x grid items-center gap-12 pb-20 pt-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pt-14 lg:min-h-[calc(100dvh-5rem)] lg:pb-24 xl:gap-20">
        <div>
          <h1 className="text-5xl font-bold leading-[1.02] sm:text-6xl xl:text-7xl 2xl:text-8xl">
            Study together.
            <br />
            Soar together.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft xl:text-xl 2xl:max-w-2xl 2xl:text-2xl">
            Make a private room, drop in your lecture PDFs, and xor turns them into flashcards and quizzes for your
            whole group. Then see who tops the board.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary text-lg">
              Make your first room
            </Link>
            <Link href="/login" className="btn btn-sun text-lg">
              I have a room key
            </Link>
          </div>
        </div>

        {/* Pip with a live-looking quiz card */}
        <div className="relative mx-auto w-full max-w-md pb-10 pr-4 sm:pr-0 md:max-w-none xl:max-w-xl 2xl:max-w-2xl">
          <span aria-hidden className="absolute -right-10 -top-10 size-64 rounded-full bg-sun-tint sm:size-80" />
          <span aria-hidden className="absolute -bottom-6 -left-10 size-48 rounded-full bg-grape-tint" />
          <div className="card relative rotate-2 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-ink-soft">
              <span>Bio 101 · Quiz 3</span>
              <span className="chip border-sun bg-sun-tint text-ink">Question 4 of 10</span>
            </div>
            <p className="mt-3 font-display text-xl font-semibold sm:text-2xl">Which organelle makes most of the cell&apos;s ATP?</p>
            <div className="mt-4 grid gap-2">
              {["Ribosome", "Mitochondrion", "Golgi body", "Nucleus"].map((o, i) => (
                <div
                  key={o}
                  className={`card-flat px-3 py-2.5 font-semibold ${i === 1 ? "border-grape bg-grape-tint" : ""}`}
                >
                  {o} {i === 1 && <span className="float-right text-grape">✓</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="card absolute -bottom-2 left-0 -rotate-3 border-sun bg-sun-tint px-4 py-3 sm:-left-6">
            <p className="text-xs font-bold text-ink-soft">Room leaderboard</p>
            <p className="font-display font-semibold">🥇 xorreur · 248 pts</p>
          </div>
          <Mascot size={96} mood="party" className="bob absolute -right-1 -top-14 sm:-right-6" />
        </div>
      </section>

      <section className="bg-lilac">
        <div className="page-x grid gap-5 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
          {[
            { icon: KeyRound, title: "Private rooms", body: "Each room has a secret key. Only people you share it with can get in.", tint: "bg-grape-tint text-grape" },
            { icon: FileText, title: "Any PDF", body: "Notes, books, or slides with pictures. Up to 50 MB and 100+ pages.", tint: "bg-sun-tint text-ink" },
            { icon: Layers, title: "8 question types", body: "Multiple choice to essays, with AI grading and feedback.", tint: "bg-grape-tint text-grape" },
            { icon: Trophy, title: "Friendly ranks", body: "Your first try counts on the board. Practice as much as you like after.", tint: "bg-sun-tint text-ink" },
          ].map(({ icon: Icon, title, body, tint }) => (
            <div key={title} className="card p-6">
              <span className={`inline-grid size-12 place-items-center rounded-2xl ${tint}`}>
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
