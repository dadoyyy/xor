"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Themed toasts + confirm dialogs (replace browser alert/confirm).    */
/* ------------------------------------------------------------------ */

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; body?: string };

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** if set, the user must type this text exactly before confirming */
  typeToConfirm?: string;
};

type Ctx = {
  toast: (t: { kind?: ToastKind; title: string; body?: string }) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<Ctx | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { icon: typeof Info; ring: string; iconCls: string }> = {
  success: { icon: CheckCircle2, ring: "var(--grape)", iconCls: "bg-grape-tint text-grape" },
  error: { icon: XCircle, ring: "var(--coral)", iconCls: "bg-coral-tint text-coral" },
  info: { icon: Info, ring: "var(--sun-deep)", iconCls: "bg-sun-tint text-ink" },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const toast = useCallback<Ctx["toast"]>(
    ({ kind = "success", title, body }) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-3), { id, kind, title, body }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const confirm = useCallback<Ctx["confirm"]>(
    (o) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    [],
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* toasts: bottom-center on phones, bottom-right on larger screens */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        style={{ zIndex: 60 }}
      >
        {toasts.map((t) => {
          const k = KIND_STYLE[t.kind];
          const Icon = k.icon;
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="pop pointer-events-auto w-full max-w-sm rounded-2xl border-2 bg-white p-3 pr-2"
              style={{ borderColor: k.ring, boxShadow: `0 5px 0 color-mix(in srgb, ${k.ring} 20%, transparent), 0 16px 30px -14px rgba(91,33,182,0.35)` }}
            >
              <div className="flex items-center gap-2.5">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${k.iconCls}`}>
                  <Icon size={16} />
                </span>
                <p className="min-w-0 flex-1 font-display font-semibold leading-snug">{t.title}</p>
                <button
                  className="grid size-7 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-lilac"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
              {t.body && (
                <p className="mt-1 pr-2 text-sm text-ink-soft" style={{ paddingLeft: "2.375rem" }}>
                  {t.body}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dialog && <ConfirmDialog options={dialog} onClose={close} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (v: boolean) => void }) {
  const { title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, typeToConfirm } = options;
  const [typed, setTyped] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ok = !typeToConfirm || typed === typeToConfirm;

  useEffect(() => {
    (typeToConfirm ? inputRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, typeToConfirm]);

  return (
    <div className="fixed inset-0 grid place-items-center p-4" style={{ zIndex: 70 }}>
      <div className="absolute inset-0" style={{ background: "rgba(43, 37, 69, 0.35)" }} onClick={() => onClose(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? "confirm-body" : undefined}
        className="card pop relative w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${danger ? "bg-coral-tint text-coral" : "bg-grape-tint text-grape"}`}
          >
            {danger ? <AlertTriangle size={20} /> : <Info size={20} />}
          </span>
          <h2 id="confirm-title" className="min-w-0 text-xl font-semibold leading-tight">
            {title}
          </h2>
        </div>
        {body && (
          <p id="confirm-body" className="mt-3 whitespace-pre-line text-ink-soft">
            {body}
          </p>
        )}
        {typeToConfirm && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (ok) onClose(true);
            }}
          >
            <label className="label" htmlFor="type-confirm">
              Type <span className="rounded-md bg-lilac px-1.5 py-0.5 font-display">{typeToConfirm}</span> to confirm
            </label>
            <input
              id="type-confirm"
              ref={inputRef}
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </form>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={!ok} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
