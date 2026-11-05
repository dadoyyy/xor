"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function ResetPassword() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/rooms");
  }

  return (
    <AuthShell mood="think">
      <form onSubmit={submit} className="grid gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Set a new password</h1>
          <p className="mt-1 text-ink-soft">Use at least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw">
            New password
          </label>
          <input
            id="pw"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </AuthShell>
  );
}
