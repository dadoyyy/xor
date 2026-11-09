"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/layout/NavProgress";
import { startQuizAttempt } from "../services/quizService";

export default function StartQuizButton({ quizId, roomId, label }: { quizId: string; roomId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const body = await startQuizAttempt(quizId);
      startNavProgress();
      router.push(`/subjects/${roomId}/quizzes/${quizId}/take/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the quiz.");
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary mt-5 w-full text-lg sm:w-auto" onClick={start} disabled={busy}>
        {busy && <span className="spinner" aria-hidden />}
            {busy ? "Getting ready…" : label}
      </button>
      {error && <p className="mt-3 rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
    </>
  );
}

