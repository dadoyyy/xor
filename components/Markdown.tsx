"use client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Wide things (tables, code) scroll sideways in their own box so the page itself never overflows.
const components: Components = {
  table: ({ children }) => (
    <div className="md-scroll my-3 overflow-x-auto rounded-xl border-2 border-line">
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className="md-scroll my-3 overflow-x-auto rounded-xl bg-lilac p-3 text-[13px] leading-snug">{children}</pre>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-grape underline underline-offset-2">
      {children}
    </a>
  ),
};

// Renders AI notes safely (no raw HTML).
export default function Markdown({ text }: { text: string }) {
  return (
    <div className="md min-w-0 text-[15px] leading-relaxed" style={{ overflowWrap: "anywhere" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
