"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/components/layout/NavProgress";

/**
 * Navigate after an action (save, join, submit) without a dead moment:
 * `pending` stays true until the next page is actually on screen,
 * and the top progress bar runs meanwhile.
 */
export function useNav() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function go(href: string, opts: { replace?: boolean; refresh?: boolean } = {}) {
    startNavProgress();
    startTransition(() => {
      if (opts.replace) router.replace(href);
      else router.push(href);
      if (opts.refresh) router.refresh();
    });
  }
  return { go, pending, router };
}

