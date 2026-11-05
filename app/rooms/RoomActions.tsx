"use client";
import { useState } from "react";
import { useNav } from "@/lib/useNav";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Plus } from "lucide-react";

export default function RoomActions() {
  const supabase = createClient();
  const { go, pending } = useNav();
  const [tab, setTab] = useState<"join" | "create">("join");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [working, setBusy] = useState(false);
  const busy = working || pending;
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("join_room", { p_key: key });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data) return setError("No room matches that key. Double-check it with the room owner.");
    go(`/rooms/${data}`);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_room", { p_name: name, p_description: desc || null });
    setBusy(false);
    if (error) return setError(error.message);
    go(`/rooms/${data}?created=1`);
  }

  return (
    <div className="card p-4 sm:p-5">
      <div role="tablist" className="flex gap-2">
        <button
          role="tab"
          aria-selected={tab === "join"}
          className={`btn btn-sm ${tab === "join" ? "btn-sun" : "btn-ghost"}`}
          onClick={() => {
            setTab("join");
            setError(null);
          }}
        >
          <KeyRound size={16} /> Join with a key
        </button>
        <button
          role="tab"
          aria-selected={tab === "create"}
          className={`btn btn-sm ${tab === "create" ? "btn-sun" : "btn-ghost"}`}
          onClick={() => {
            setTab("create");
            setError(null);
          }}
        >
          <Plus size={16} /> Create a room
        </button>
      </div>

      {tab === "join" ? (
        <form onSubmit={join} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="key" className="sr-only">
            Secret key
          </label>
          <input
            id="key"
            className="input key-text uppercase sm:flex-1"
            placeholder="XOR-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            required
          />
          <button className="btn btn-primary" disabled={busy || key.replace(/[^a-z0-9]/gi, "").length < 8}>
            {busy && <span className="spinner" aria-hidden />}
            {pending ? "Opening room…" : busy ? "Checking…" : "Join room"}
          </button>
        </form>
      ) : (
        <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
          <div>
            <label htmlFor="rname" className="sr-only">
              Room name
            </label>
            <input
              id="rname"
              className="input"
              placeholder="Room name, e.g. Bio 101"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="rdesc" className="sr-only">
              Description
            </label>
            <input
              id="rdesc"
              className="input"
              placeholder="What's it for? (optional)"
              maxLength={280}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy && <span className="spinner" aria-hidden />}
            {pending ? "Opening room…" : busy ? "Creating…" : "Create room"}
          </button>
        </form>
      )}
      {error && <p className="mt-3 rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
    </div>
  );
}
