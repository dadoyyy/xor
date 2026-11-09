"use client";
import { useState } from "react";
import { useNav } from "@/hooks/useNav";
import { useFeedback } from "@/components/ui/Feedback";
import { NewTag } from "@/components/ui/Badges";
import type { MemberRow } from "../types";
import { avatarCls, formatJoinedDate, initials } from "../utils";
import { deleteRoom as deleteRoomApi, regenerateRoomKey, removeRoomMember, updateRoomDetails } from "../services/memberService";
import { Check, Copy, Crown, Eye, EyeOff, LogOut, RefreshCw, Trash2, UserMinus, UserPlus } from "lucide-react";

export default function MembersClient(props: {
  roomId: string;
  roomName: string;
  roomDescription: string;
  meId: string;
  isOwner: boolean;
  secretKey: string | null;
  members: MemberRow[];
}) {
  const { roomId, meId, isOwner, members } = props;
  const { go, pending, router } = useNav();
  const [navLabel, setNavLabel] = useState<string | null>(null);
  const [key, setKey] = useState(props.secretKey);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [working, setBusy] = useState<string | null>(null);
  const busy = working ?? (pending ? navLabel : null);
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState(props.roomName);
  const [desc, setDesc] = useState(props.roomDescription);
  const [saved, setSaved] = useState(false);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast({ kind: "error", title: "That didn't work", body: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  const copy = () =>
    run("copy", async () => {
      await navigator.clipboard.writeText(key!);
      setCopied(true);
      toast({ title: "Key copied", body: "Send it to the friends you want in this room." });
      setTimeout(() => setCopied(false), 1800);
    });

  const regenerate = () =>
    run("regen", async () => {
      const ok = await confirm({
        title: "Make a new key?",
        body: "The old key stops working right away. People already in the room stay in.",
        confirmLabel: "Make new key",
      });
      if (!ok) return;
      const newKey = await regenerateRoomKey(roomId);
      setKey(newKey);
      setShowKey(true);
      toast({ title: "New key made", body: "Share the new key. The old one no longer works." });
    });

  const remove = (m: MemberRow) =>
    run("rm-" + m.userId, async () => {
      const ok = await confirm({
        title: `Remove ${m.username}?`,
        body: "They'll need the room key to join again.",
        confirmLabel: "Remove member",
        danger: true,
      });
      if (!ok) return;
      await removeRoomMember(roomId, m.userId);
      toast({ title: `${m.username} removed` });
      router.refresh();
    });

  const leave = () =>
    run("leave", async () => {
      const ok = await confirm({
        title: "Leave this room?",
        body: "You'll need the room key to come back. Your scores stay on the leaderboard.",
        confirmLabel: "Leave room",
        danger: true,
      });
      if (!ok) return;
      await removeRoomMember(roomId, meId);
      setNavLabel("leave");
      go("/rooms", { replace: true, refresh: true });
    });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run("save", async () => {
      await updateRoomDetails(roomId, name, desc);
      setSaved(true);
      toast({ title: "Room details saved" });
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    });
  };

  const deleteRoom = () =>
    run("delete", async () => {
      const ok = await confirm({
        title: "Delete this room?",
        body: "This deletes the room, its files, quizzes and leaderboards for everyone. It can't be undone.",
        confirmLabel: "Delete room",
        danger: true,
        typeToConfirm: props.roomName,
      });
      if (!ok) return;
      await deleteRoomApi(roomId);
      setNavLabel("delete");
      go("/rooms", { replace: true, refresh: true });
    });

  const shown = members.slice(0, 6);

  return (
    <div className="grid gap-6">
      {/* header band: count + avatar stack + (owner) secret key */}
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <span aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-sun-tint" />
        <span aria-hidden className="absolute -bottom-24 right-40 size-48 rounded-full bg-grape-tint" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex shrink-0">
              {shown.map((m, k) => (
                <span
                  key={m.userId}
                  title={m.username}
                  className={`grid size-11 place-items-center rounded-full font-display font-bold ${avatarCls(m.username)}`}
                  style={{ marginLeft: k ? "-0.6rem" : 0, boxShadow: "0 0 0 3px #fff", zIndex: shown.length - k }}
                >
                  {m.username.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {members.length > shown.length && (
                <span
                  className="grid size-11 place-items-center rounded-full bg-lilac font-display text-sm font-bold text-grape"
                  style={{ marginLeft: "-0.6rem", boxShadow: "0 0 0 3px #fff" }}
                >
                  +{members.length - shown.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold leading-tight">
                {members.length} {members.length === 1 ? "member" : "members"}
              </h2>
              <p className="text-sm text-ink-soft">
                {members.length === 1 ? "Just you so far. Invite your study buddies!" : "Everyone here can take quizzes and climb the leaderboard."}
              </p>
            </div>
          </div>

          {isOwner && key ? (
            <div className="w-full shrink-0 rounded-2xl border-2 border-sun bg-sun-tint p-4 lg:w-[27rem]">
              <p className="text-sm font-bold">Secret key</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2" style={{ minWidth: "11.5rem" }}>
                  <span className="key-text whitespace-nowrap text-lg">{showKey ? key : "XOR-••••-••••"}</span>
                  <button
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-lilac"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button className="btn btn-primary btn-sm" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
                </button>
                <button className="btn btn-sm" onClick={regenerate} disabled={!!busy} title="Make a new key">
                  <RefreshCw size={16} /> New key
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-soft">If the key leaks, make a new one. The old key stops working.</p>
            </div>
          ) : (
            <p className="rounded-2xl bg-lilac px-4 py-3 text-sm font-semibold lg:max-w-xs">
              Want to invite someone? Ask the room owner for the secret key.
            </p>
          )}
        </div>
      </section>

      {/* member cards */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">People in this room</h3>
        <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {members.map((m) => (
            <li key={m.userId} className="card flex items-center gap-3 p-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl font-display font-bold ${avatarCls(m.username)}`}>
                {initials(m.username)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold">
                  <span className="truncate">
                    {m.username} {m.userId === meId && <span className="font-semibold text-ink-soft">(you)</span>}
                  </span>
                  <NewTag show={!!m.isNew} />
                </p>
                <p className="text-xs text-ink-soft">Joined {formatJoinedDate(m.joinedAt)}</p>
              </div>
              {m.role === "owner" && (
                <span className="chip shrink-0 border-sun bg-sun-tint">
                  <Crown size={13} /> Owner
                </span>
              )}
              {m.role !== "owner" && isOwner && (
                <button
                  className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-coral-tint hover:text-coral"
                  onClick={() => remove(m)}
                  disabled={!!busy}
                  aria-label={`Remove ${m.username}`}
                  title="Remove from room"
                >
                  <UserMinus size={18} />
                </button>
              )}
            </li>
          ))}

          {/* invite card fills the grid with something useful */}
          <li className="flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-dashed border-grape/40 bg-lilac p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-grape">
              <UserPlus size={22} />
            </span>
            <div className="flex-1" style={{ minWidth: "9rem" }}>
              <p className="font-bold">Invite friends</p>
              <p className="text-xs text-ink-soft">{isOwner ? "Copy the secret key and send it to them." : "Ask the owner for the key."}</p>
            </div>
            {isOwner && key && (
              <button className="btn btn-sm" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy key"}
              </button>
            )}
          </li>
        </ul>
      </section>

      {/* settings */}
      {isOwner ? (
        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <form onSubmit={save} className="card grid content-start gap-4 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Room details</h3>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <label className="label" htmlFor="rn">
                  Name
                </label>
                <input id="rn" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="rd">
                  Description
                </label>
                <input id="rd" className="input" maxLength={280} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this room for?" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm justify-self-start" disabled={!!busy}>
              {saved ? <Check size={16} /> : null} {saved ? "Saved" : "Save changes"}
            </button>
          </form>

          <div className="card flex flex-col gap-3 border-coral/40 p-5 sm:flex-row sm:items-center sm:gap-4 lg:flex-col lg:items-start xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">Danger zone</h3>
              <p className="mt-0.5 text-sm text-ink-soft">Deleting the room removes its files, quizzes, flashcards and leaderboards for everyone.</p>
            </div>
            <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={deleteRoom} disabled={!!busy}>
              {busy === "delete" ? <span className="spinner" aria-hidden /> : <Trash2 size={16} />} {busy === "delete" ? "Deleting…" : "Delete room"}
            </button>
          </div>
        </section>
      ) : (
        <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Leave this room</h3>
            <p className="text-sm text-ink-soft">You&apos;ll need the secret key to come back. Your scores stay on the leaderboard.</p>
          </div>
          <button className="btn btn-sm" onClick={leave} disabled={!!busy}>
            {busy === "leave" ? <span className="spinner" aria-hidden /> : <LogOut size={16} />} {busy === "leave" ? "Leaving…" : "Leave room"}
          </button>
        </section>
      )}
    </div>
  );
}

