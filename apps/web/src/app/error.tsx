"use client";
import Mascot from "@/components/ui/Mascot";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-lilac items-center justify-center px-4 text-center">
      <Mascot size={100} mood="think" />
      <h1 className="mt-4 text-3xl font-bold">Something broke</h1>
      <p className="mt-2 text-ink-soft">This page hit an error. Try again, and if it keeps happening, reload the app.</p>
      <button onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}

