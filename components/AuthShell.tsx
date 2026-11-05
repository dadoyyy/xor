import Link from "next/link";
import Mascot, { Logo } from "@/components/Mascot";

/** Full-screen split layout for sign-in pages: brand panel + form panel. */
export default function AuthShell({ children, mood = "happy" }: { children: React.ReactNode; mood?: "happy" | "think" | "party" }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-lilac lg:flex lg:flex-col lg:gap-16 lg:p-12 xl:p-16">
        <Link href="/" aria-label="xor home">
          <Logo />
        </Link>
        <div className="relative z-10 my-auto max-w-lg pb-40">
          <p className="font-display text-5xl font-bold leading-[1.05] xl:text-6xl">
            Study together.
            <br />
            Soar together.
          </p>
          <p className="mt-5 text-lg text-ink-soft">Private rooms, AI flashcards and quizzes from your PDFs, and a leaderboard for your study group.</p>
        </div>
        <Mascot size={220} mood={mood} className="bob pointer-events-none absolute bottom-10 right-10 xl:size-64" />
        <span aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-sun-tint" />
        <span aria-hidden className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-grape-tint" />
      </aside>

      {/* form panel */}
      <main className="flex min-h-dvh flex-col bg-white px-4 py-6 sm:px-8 lg:min-h-0 lg:justify-center lg:px-12 xl:px-20">
        <Link href="/" className="mb-8 self-start lg:hidden" aria-label="xor home">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md lg:my-0">{children}</div>
      </main>
    </div>
  );
}
