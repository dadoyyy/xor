"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartQuizButton({ quizId, roomId, label }: { quizId: string; roomId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/attempts`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Couldn't start the quiz.");
      setBusy(false);
      return;
    }
    router.push(`/rooms/${roomId}/quizzes/${quizId}/take/${body.id}`);
  }

  return (
    <>
      <button className="btn btn-primary mt-5 w-full text-lg sm:w-auto" onClick={start} disabled={busy}>
        {busy ? "Getting ready…" : label}
      </button>
      {error && <p className="mt-3 rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
    </>
  );
}
