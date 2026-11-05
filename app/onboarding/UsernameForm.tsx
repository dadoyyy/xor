"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UsernameForm({ current }: { current: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^[A-Za-z0-9_]{3,20}$/.test(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", user!.id);
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "That username is taken. Try another." : error.message);
      return;
    }
    router.replace("/rooms");
    router.refresh();
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
        {busy ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}
