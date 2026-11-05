"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/Feedback";
import { Trash2 } from "lucide-react";

/** Deletes a row the user is allowed to delete (RLS checks creator/owner). */
export default function DeleteButton({
  table,
  id,
  label,
  confirmText,
  redirectTo,
}: {
  table: "decks" | "quizzes";
  id: string;
  label: string;
  confirmText: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { confirm, toast } = useFeedback();
  return (
    <button
      className="btn btn-ghost btn-sm"
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        const what = table === "decks" ? "deck" : "quiz";
        const ok = await confirm({ title: confirmText, body: "This can't be undone.", confirmLabel: `Delete ${what}`, danger: true });
        if (!ok) return;
        setBusy(true);
        const { error } = await createClient().from(table).delete().eq("id", id);
        setBusy(false);
        if (error) return toast({ kind: "error", title: `Couldn't delete the ${what}`, body: error.message });
        toast({ title: what === "deck" ? "Deck deleted" : "Quiz deleted" });
        if (redirectTo) router.replace(redirectTo);
        router.refresh();
      }}
    >
      {busy ? <span className="spinner" aria-hidden /> : <Trash2 size={16} />}
    </button>
  );
}
