"use client";

import type { ReactNode } from "react";

export default function SubjectWorkspaceTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="page-enter flex-1 flex flex-col min-h-0 w-full">
      {children}
    </div>
  );
}
