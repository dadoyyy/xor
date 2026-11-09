"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Mascot from "@/components/ui/Mascot";
import NotesDialog from "./NotesDialog";
import TextImportDialog from "./TextImportDialog";
import { useFeedback } from "@/components/ui/Feedback";
import { NewTag } from "@/components/ui/Badges";
import type { MaterialRow } from "../types";
import {
  deleteMaterialById,
  fetchMaterialNotes,
  getMaterialSignedUrl,
  startMaterialProcessing,
  uploadMaterialFile,
} from "../services/materialService";
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, Eye, FileUp, Loader2, RotateCw, Trash2 } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024;

function fmtSize(b: number | null) {
  if (!b) return "";
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

export default function MaterialsClient({
  roomId,
  meId,
  isOwner,
  canEdit = true,
  role = "editor",
  materials,
  justCreated,
}: {
  roomId: string;
  meId: string;
  isOwner: boolean;
  canEdit?: boolean;
  role?: string;
  materials: MaterialRow[];
  justCreated: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MaterialRow[]>(materials);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notes, setNotes] = useState<{ title: string; content: string | null } | null>(null);
  const [showTextImport, setShowTextImport] = useState(false);
  const { confirm, toast } = useFeedback();

  useEffect(() => {
    setItems(materials);
  }, [materials]);

  // Poll only pending materials via lightweight status endpoint
  useEffect(() => {
    const pendingIds = items
      .filter((m) => m.status === "processing" || m.status === "uploaded")
      .map((m) => m.id);

    if (pendingIds.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      for (const id of pendingIds) {
        try {
          const res = await fetch(`/api/materials/${id}`);
          if (!res.ok) continue;
          const statusData = await res.json();
          if (cancelled) return;
          if (statusData && statusData.status !== "processing" && statusData.status !== "uploaded") {
            setItems((prev) =>
              prev.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      status: statusData.status,
                      error: statusData.error ?? null,
                      pageCount: statusData.pageCount ?? m.pageCount,
                    }
                  : m
              )
            );
          }
        } catch {}
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [items]);

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
        const { id: newId, title } = await uploadMaterialFile(roomId, meId, file);
        toast({ title: "PDF uploaded", body: `The AI is reading “${title}” now. It shows Ready when it's done.` });
        setItems((prev) => [
          {
            id: newId,
            title,
            filePath: null,
            fileSize: file.size,
            status: "processing",
            pageCount: null,
            error: null,
            uploadedBy: meId,
            uploader: "You",
            createdAt: new Date().toISOString(),
            processingStartedAt: new Date().toISOString(),
            isNew: false,
          },
          ...prev,
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading(null);
      }
    }
  }

  async function retry(id: string) {
    setError(null);
    try {
      await startMaterialProcessing(id);
      setItems((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "processing", error: null } : m))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed.");
    }
  }

  async function remove(m: MaterialRow) {
    const ok = await confirm({
      title: `Delete "${m.title}"?`,
      body: "The PDF and its notes are removed. Quizzes and flashcards made from it stay.",
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!ok) return;
    const res = await deleteMaterialById(m.id);
    if (!res.ok) {
      toast({ kind: "error", title: "Couldn't delete the file", body: res.error });
    } else {
      toast({ title: "File deleted" });
      setItems((prev) => prev.filter((it) => it.id !== m.id));
    }
  }

  async function openPdf(m: MaterialRow) {
    if (!m.filePath) return;
    try {
      const signedUrl = await getMaterialSignedUrl(m.filePath);
      window.open(signedUrl, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open PDF.");
    }
  }

  async function viewNotes(m: MaterialRow) {
    setNotes({ title: m.title, content: null }); // open right away with a skeleton
    try {
      const content = await fetchMaterialNotes(m.id);
      setNotes((n) => (n && n.title === m.title ? { title: m.title, content } : n));
    } catch (e) {
      setNotes(null);
      setError(e instanceof Error ? e.message : "Couldn't load notes.");
    }
  }

  const closeNotes = useCallback(() => setNotes(null), []);

  const readyCount = items.filter((m) => m.status === "ready").length;

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
          {canEdit ? (
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
              className={`flex flex-col items-center rounded-[20px] border border-dashed px-6 py-6 text-center transition-colors shadow-none ${
                dragOver ? "border-[#5223BD] bg-[#EFE9FF]" : "border-[#5223BD]/30 bg-[#F7F5FF]"
              }`}
            >
              <span className="grid size-12 place-items-center rounded-[10px] bg-white text-[#5223BD] shadow-none">
                {uploading ? <Loader2 className="animate-spin" /> : <FileUp size={22} />}
              </span>
              <p className="mt-2.5 font-display text-base font-bold text-ink">
                {uploading ? `Uploading ${uploading}…` : "Add study materials"}
              </p>
              <p className="text-xs text-ink-soft">PDFs up to 50 MB. Slides with pictures work too.</p>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm shadow-none"
                  onClick={() => fileInput.current?.click()}
                  disabled={!!uploading}
                >
                  Choose PDFs
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm shadow-none"
                  onClick={() => setShowTextImport(true)}
                  disabled={!!uploading}
                >
                  Import text
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-center p-5 text-center shadow-none">
              <span className="grid size-10 place-items-center rounded-[10px] bg-white text-[#5223BD]">
                <Eye size={20} />
              </span>
              <p className="mt-2.5 font-display text-sm font-bold text-ink">View-Only Access</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                You have viewer permissions. You can read notes and download PDFs.
              </p>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-[14px] bg-[#FDE8E8] px-3.5 py-2.5 text-xs font-semibold text-coral">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {canEdit && readyCount > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/subjects/${roomId}/quizzes/new`} className="btn btn-accent btn-sm shadow-none text-center justify-center">
                Make quiz
              </Link>
              <Link href={`/subjects/${roomId}/flashcards/new`} className="btn btn-secondary btn-sm shadow-none text-center justify-center">
                Make cards
              </Link>
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">
            Study materials {items.length > 0 && <span className="text-ink-soft font-normal text-sm">({items.length})</span>}
          </h2>
          {items.length === 0 ? (
            <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-center px-6 py-10 text-center shadow-none">
              <Mascot size={64} mood="sleepy" />
              <p className="mt-3 font-display text-base font-bold text-ink">No materials yet</p>
              <p className="text-xs text-ink-soft mb-3">Upload a PDF or import text for this subject.</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="btn btn-primary btn-sm shadow-none text-xs"
                >
                  Upload first material
                </button>
              )}
            </div>
          ) : (
            <ul className="grid gap-3">
              {items.map((m) => {
                const canDelete = canEdit && (m.uploadedBy === meId || isOwner);
                const stale =
                  m.status === "processing" &&
                  (!m.processingStartedAt || Date.now() - new Date(m.processingStartedAt).getTime() > 6 * 60 * 1000);
                return (
                  <li
                    key={m.id}
                    className="rounded-[20px] bg-[#F7F5FF] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-none select-none transition hover:bg-[#EFE9FF]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                        <span className="truncate">{m.title}</span> <NewTag show={!!m.isNew} />
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {m.uploader} · {new Date(m.createdAt).toLocaleDateString()}
                        {m.pageCount ? ` · ${m.pageCount} pages` : ""}
                        {m.fileSize ? ` · ${fmtSize(m.fileSize)}` : ""}
                      </p>
                      {m.status === "failed" && m.error && (
                        <p className="mt-1 text-xs font-semibold text-coral">{m.error}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {m.status === "ready" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-0.5 text-[11px] font-bold text-mint">
                          <CheckCircle2 size={13} /> Ready
                        </span>
                      )}
                      {(m.status === "processing" || m.status === "uploaded") && !stale && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-2.5 py-0.5 text-[11px] font-bold text-ink">
                          <Loader2 size={13} className="animate-spin" /> Reading…
                        </span>
                      )}
                      {(m.status === "failed" || stale) && (m.uploadedBy === meId || isOwner) && (
                        <button className="btn btn-sm shadow-none" onClick={() => retry(m.id)}>
                          <RotateCw size={13} /> Retry
                        </button>
                      )}
                      {m.status === "ready" && (
                        <button className="btn btn-secondary btn-sm shadow-none text-xs" onClick={() => viewNotes(m)}>
                          <BookOpen size={14} /> Notes
                        </button>
                      )}
                      {m.filePath && (
                        <button className="btn btn-secondary btn-sm shadow-none text-xs" onClick={() => openPdf(m)} aria-label={`Open ${m.title} PDF`}>
                          <ExternalLink size={14} /> PDF
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-ghost btn-sm shadow-none text-coral hover:text-coral" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>
                          <Trash2 size={15} />
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

      {notes && <NotesDialog title={notes.title} content={notes.content} onClose={closeNotes} />}
      {showTextImport && <TextImportDialog subjectId={roomId} onClose={() => setShowTextImport(false)} />}
    </div>
  );
}

