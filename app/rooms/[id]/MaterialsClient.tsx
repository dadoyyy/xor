"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Mascot from "@/components/Mascot";
import Markdown from "@/components/Markdown";
import { useFeedback } from "@/components/Feedback";
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, FileUp, Loader2, RotateCw, Trash2, X } from "lucide-react";

export type MaterialRow = {
  id: string;
  title: string;
  filePath: string | null;
  fileSize: number | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  pageCount: number | null;
  error: string | null;
  uploadedBy: string;
  uploader: string;
  createdAt: string;
  processingStartedAt: string | null;
};

const MAX_BYTES = 50 * 1024 * 1024;

function fmtSize(b: number | null) {
  if (!b) return "";
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

export default function MaterialsClient({
  roomId,
  meId,
  isOwner,
  materials,
  justCreated,
}: {
  roomId: string;
  meId: string;
  isOwner: boolean;
  materials: MaterialRow[];
  justCreated: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notes, setNotes] = useState<{ title: string; content: string } | null>(null);
  const { confirm, toast } = useFeedback();

  // Poll while something is being read by the AI
  const pending = materials.some((m) => m.status === "processing" || m.status === "uploaded");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [pending, router]);

  async function startProcessing(id: string) {
    const res = await fetch(`/api/materials/${id}/process`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Couldn't start reading the file.");
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError(`${file.name} isn't a PDF. Only PDF files are supported.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is ${fmtSize(file.size)}. The limit is 50 MB.`);
        continue;
      }
      setUploading(file.name);
      try {
        const path = `${roomId}/${crypto.randomUUID()}.pdf`;
        const up = await supabase.storage.from("materials").upload(path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
        if (up.error) throw up.error;
        const title = file.name.replace(/\.pdf$/i, "").slice(0, 120) || "Untitled";
        const { data, error } = await supabase
          .from("materials")
          .insert({ room_id: roomId, uploaded_by: meId, title, file_path: path, file_size: file.size })
          .select("id")
          .single();
        if (error) throw error;
        await startProcessing(data.id);
        toast({ title: "PDF uploaded", body: `The AI is reading “${title}” now. It shows Ready when it's done.` });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading(null);
        router.refresh();
      }
    }
  }

  async function retry(id: string) {
    setError(null);
    try {
      await startProcessing(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed.");
    }
    router.refresh();
  }

  async function remove(m: MaterialRow) {
    const ok = await confirm({
      title: `Delete "${m.title}"?`,
      body: "The PDF and its notes are removed. Quizzes and flashcards made from it stay.",
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/materials/${m.id}`, { method: "DELETE" });
    if (!res.ok) toast({ kind: "error", title: "Couldn't delete the file", body: (await res.json()).error });
    else toast({ title: "File deleted" });
    router.refresh();
  }

  async function openPdf(m: MaterialRow) {
    if (!m.filePath) return;
    const { data, error } = await supabase.storage.from("materials").createSignedUrl(m.filePath, 60 * 10);
    if (error) return setError(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function viewNotes(m: MaterialRow) {
    const { data, error } = await supabase.from("materials").select("content").eq("id", m.id).single();
    if (error) return setError(error.message);
    setNotes({ title: m.title, content: data.content ?? "" });
  }

  const readyCount = materials.filter((m) => m.status === "ready").length;

  return (
    <div className="grid gap-6">
      {justCreated && (
        <div className="card flex flex-col gap-3 border-sun bg-sun-tint p-5 sm:flex-row sm:items-center">
          <Mascot size={56} mood="party" />
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Your room is ready!</p>
            <p className="text-sm text-ink-soft">Grab the secret key from Members and send it to your friends.</p>
          </div>
          <Link href={`/rooms/${roomId}/members`} className="btn btn-sm">
            Get the key
          </Link>
        </div>
      )}


      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <aside className="grid content-start gap-4 xl:sticky xl:top-24 xl:order-last xl:self-start">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center rounded-[22px] border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-grape bg-grape-tint" : "border-grape/40 bg-lilac"}`}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-grape shadow-[0_4px_0_var(--line)]">
          {uploading ? <Loader2 className="animate-spin" /> : <FileUp />}
        </span>
        <p className="mt-3 font-display text-lg font-semibold">
          {uploading ? `Uploading ${uploading}…` : "Add study materials"}
        </p>
        <p className="text-sm text-ink-soft">PDFs up to 50 MB. Slides with pictures work too.</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <button className="btn btn-primary mt-4" onClick={() => fileInput.current?.click()} disabled={!!uploading}>
          Choose PDFs
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {readyCount > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/rooms/${roomId}/quizzes/new`} className="btn btn-sun">
            Make a quiz
          </Link>
          <Link href={`/rooms/${roomId}/flashcards/new`} className="btn">
            Make flashcards
          </Link>
        </div>
      )}

        </aside>

        <section className="min-w-0">
          <h2 className="mb-3 text-xl font-semibold">
            Study materials {materials.length > 0 && <span className="text-ink-soft">({materials.length})</span>}
          </h2>
      {materials.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <Mascot size={80} mood="sleepy" />
          <p className="mt-3 font-display text-lg font-semibold">No materials yet</p>
          <p className="text-sm text-ink-soft">Upload a PDF and the AI will read it for this room.</p>
        </div>
      ) : (
        <ul className="grid gap-3 2xl:grid-cols-2">
          {materials.map((m) => {
            const canDelete = m.uploadedBy === meId || isOwner;
            const stale =
              m.status === "processing" &&
              (!m.processingStartedAt || Date.now() - new Date(m.processingStartedAt).getTime() > 6 * 60 * 1000);
            return (
              <li key={m.id} className="card-flat flex flex-col gap-3 p-4 sm:flex-row sm:items-center 2xl:flex-col 2xl:items-stretch">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.title}</p>
                  <p className="text-xs text-ink-soft">
                    {m.uploader} · {new Date(m.createdAt).toLocaleDateString()}
                    {m.pageCount ? ` · ${m.pageCount} pages` : ""}
                    {m.fileSize ? ` · ${fmtSize(m.fileSize)}` : ""}
                  </p>
                  {m.status === "failed" && m.error && <p className="mt-1 text-xs font-semibold text-coral">{m.error}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {m.status === "ready" && (
                    <span className="chip border-mint/30 bg-mint-tint text-mint">
                      <CheckCircle2 size={14} /> Ready
                    </span>
                  )}
                  {(m.status === "processing" || m.status === "uploaded") && !stale && (
                    <span className="chip border-sun bg-sun-tint">
                      <Loader2 size={14} className="animate-spin" /> Reading…
                    </span>
                  )}
                  {(m.status === "failed" || stale) && (m.uploadedBy === meId || isOwner) && (
                    <button className="btn btn-sm" onClick={() => retry(m.id)}>
                      <RotateCw size={14} /> Try again
                    </button>
                  )}
                  {m.status === "ready" && (
                    <button className="btn btn-sm" onClick={() => viewNotes(m)}>
                      <BookOpen size={14} /> Notes
                    </button>
                  )}
                  {m.filePath && (
                    <button className="btn btn-sm" onClick={() => openPdf(m)} aria-label={`Open ${m.title} PDF`}>
                      <ExternalLink size={14} /> PDF
                    </button>
                  )}
                  {canDelete && (
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

        </section>
      </div>

      {notes && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#2b2545]/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Notes for ${notes.title}`}
          onClick={() => setNotes(null)}
        >
          <div className="card flex max-h-[85dvh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b-2 border-line px-5 py-3">
              <p className="truncate font-display text-lg font-semibold">{notes.title}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setNotes(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <p className="mb-3 text-xs text-ink-soft">These are the notes the AI read from your PDF. Quizzes and flashcards come from these.</p>
              <Markdown text={notes.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
