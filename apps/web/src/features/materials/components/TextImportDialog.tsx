"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/Feedback";
import { parseStructuredImportText, type ParseError, type TextImportParseResult } from "@xor/shared-utils";
import { AlertCircle, CheckCircle2, FileText, HelpCircle, Layers, Sparkles, X } from "lucide-react";

const EXAMPLE_TEMPLATES = {
  qa: `Q: What is the primary role of ATP in cellular processes?
A: It provides energy for metabolic reactions, active transport, and mechanical work.

Q: Where does glycolysis occur in eukaryotic cells?
A: In the cytosol.`,
  mcq: `[MCQ] Which organelle produces the majority of cellular ATP via oxidative phosphorylation?
A) Ribosome
B) Mitochondrion *
C) Golgi apparatus
D) Peroxisome

[MCQ] Which molecule is the final electron acceptor in aerobic respiration?
A) Carbon dioxide
B) Water
C) Oxygen *
D) Glucose`,
  mixed: `[MCQ] During cellular respiration, one molecule of glucose yields approximately how many net ATP?
A) 2
B) 4
C) 30 to 32 *
D) 100

[BLANK] The enzyme complex that synthesizes ATP using a proton gradient is ________.
ANSWER: ATP synthase`,
};

export default function TextImportDialog({
  subjectId,
  onClose,
}: {
  subjectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [previewResult, setPreviewResult] = useState<TextImportParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  function handlePreview() {
    setCommitError(null);
    const res = parseStructuredImportText(text);
    setPreviewResult(res);
  }

  async function handleCommit() {
    if (!previewResult || !previewResult.ok) return;
    setLoading(true);
    setCommitError(null);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          title: title.trim() || undefined,
          action: "commit",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to import study set.");
      }
      toast({
        title: "Import completed!",
        body: `Created ${data.summary?.totalItems ?? 0} study items without using AI quota.`,
      });
      router.refresh();
      onClose();
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Failed to save imported study set.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-grape-tint text-grape">
              <FileText size={20} />
            </span>
            <div>
              <h3 className="font-display text-xl font-bold">Import Formatted Text</h3>
              <p className="text-xs text-ink-soft">Create flashcards and quizzes instantly without AI quota</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Template Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-soft">Templates:</span>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => {
              setText(EXAMPLE_TEMPLATES.qa);
              setPreviewResult(parseStructuredImportText(EXAMPLE_TEMPLATES.qa));
            }}
          >
            Q&A Flashcards
          </button>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => {
              setText(EXAMPLE_TEMPLATES.mcq);
              setPreviewResult(parseStructuredImportText(EXAMPLE_TEMPLATES.mcq));
            }}
          >
            Multiple Choice (MCQ)
          </button>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => {
              setText(EXAMPLE_TEMPLATES.mixed);
              setPreviewResult(parseStructuredImportText(EXAMPLE_TEMPLATES.mixed));
            }}
          >
            Mixed MCQ + Fill-in-Blank
          </button>
        </div>

        {/* Input Text Area */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-ink-soft">Set Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 Bio Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1 w-full text-sm"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink-soft">Paste Formatted Text (Max 100 items / 250 KB)</label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreviewResult(null);
              }}
              placeholder={`[MCQ] What organelle generates cellular ATP?\nA) Ribosome\nB) Mitochondrion *\nC) Nucleus\n\n[BLANK] Glycolysis produces two molecules of ________.\nANSWER: pyruvate`}
              className="input mt-1 w-full font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!text.trim()}
              onClick={handlePreview}
            >
              <Sparkles size={16} /> Preview Items
            </button>
          </div>
        </div>

        {/* Preview & Validation Errors */}
        {previewResult && (
          <div className="mt-5 rounded-2xl border border-line bg-lilac/30 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="font-display text-sm font-bold">
                Preview Summary: {previewResult.summary.totalItems} items detected
              </span>
              <span className="badge badge-sm uppercase">
                {previewResult.detectedType.replace("_", " ")}
              </span>
            </div>

            {previewResult.errors.length > 0 && (
              <div className="mt-2 space-y-1.5 rounded-xl border border-coral/30 bg-coral-tint p-3 text-xs text-coral">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={15} />
                  <span>Validation Issues ({previewResult.errors.length}):</span>
                </div>
                {previewResult.errors.map((err: ParseError, idx: number) => (
                  <p key={idx} className="ml-5">
                    Line {err.line}: {err.message}
                  </p>
                ))}
              </div>
            )}

            {previewResult.items.length > 0 && (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {previewResult.items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-line/60 bg-white p-2.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-ink-soft">
                      <span>#{idx + 1} {item.kind === "flashcard" ? "Flashcard" : item.qtype}</span>
                      <span>Line {item.lineNumber}</span>
                    </div>
                    <p className="mt-1 font-semibold">{item.kind === "flashcard" ? item.front : item.prompt}</p>
                    {item.kind === "flashcard" ? (
                      <p className="mt-0.5 text-ink-soft">A: {item.back}</p>
                    ) : (
                      <p className="mt-0.5 text-grape font-medium">Answer: {item.displayAnswerText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {commitError && (
          <p className="mt-3 text-xs font-semibold text-coral">{commitError}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCommit}
            disabled={loading || !previewResult || !previewResult.ok}
          >
            {loading ? <span className="spinner" /> : <CheckCircle2 size={16} />}
            Save to Subject
          </button>
        </div>
      </div>
    </div>
  );
}
