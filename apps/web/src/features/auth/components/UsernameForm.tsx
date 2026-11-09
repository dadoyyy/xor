"use client";
import { useState } from "react";
import CorgiLoader from "@/components/mascot/CorgiLoader";
import { useNav } from "@/hooks/useNav";
import { saveUsername } from "../services/authClientService";

export default function UsernameForm({ current }: { current: string }) {
  const { go, pending } = useNav();
  const [name, setName] = useState(current);
  const [working, setBusy] = useState(false);
  const busy = working || pending;
  const [error, setError] = useState<string | null>(null);
  const valid = /^[A-Za-z0-9_]{3,20}$/.test(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await saveUsername(name);
      go("/home", { replace: true, refresh: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="fade-in fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center bg-lilac px-4 py-12">
        <CorgiLoader variant="default" size={140} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <label className="label" htmlFor="username">
        Username
      </label>
      <input
        id="username"
        className="input text-lg font-bold"
        value={name}
        onChange={(e) => setName(e.target.value.trim())}
        placeholder="xorreur"
        maxLength={20}
        autoComplete="username"
        autoFocus
      />
      <p className="text-xs text-ink-soft">3–20 letters, numbers or underscores.</p>
      {error && <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary mt-2" disabled={!valid || busy}>
        {busy && <span className="spinner" aria-hidden />}
        {busy ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}

