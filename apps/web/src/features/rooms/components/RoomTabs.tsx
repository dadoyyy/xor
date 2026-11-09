"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Layers, ListChecks, Share2, Trophy, Users } from "lucide-react";
import { CountBadge } from "@/components/ui/Badges";
import LinkSpinner from "@/components/ui/LinkSpinner";
import type { Section, Updates } from "@/hooks/useRoomUpdates";

export default function RoomTabs({ roomId, vertical = false, updates = {} }: { roomId: string; vertical?: boolean; updates?: Updates }) {
  const path = usePathname();
  const isSubjectsPath = path.startsWith("/subjects");
  const base = isSubjectsPath ? `/subjects/${roomId}` : `/rooms/${roomId}`;
  const tabs = [
    { href: base, label: "Materials", icon: FileText, section: "materials" as Section, match: (p: string) => p === base },
    { href: `${base}/flashcards`, label: "Flashcards", icon: Layers, section: "flashcards" as Section },
    { href: `${base}/quizzes`, label: "Quizzes", icon: ListChecks, section: "quizzes" as Section },
    { href: `${base}/leaderboard`, label: "Leaderboard", icon: Trophy, section: "leaderboard" as Section },
    {
      href: `${base}/sharing`,
      label: "Members & Invites",
      icon: Users,
      section: "members" as Section,
      match: (p: string) => p.startsWith(`${base}/sharing`) || p.startsWith(`${base}/members`),
    },
  ];

  if (vertical)
    return (
      <nav aria-label="Room sections">
        <ul className="grid gap-1.5">
          {tabs.map(({ href, label, icon: Icon, match, section }) => {
            const active = match ? match(path) : path.startsWith(href);
            const count = active ? 0 : (updates[section] ?? 0);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-full px-4 py-2.5 font-display font-semibold transition-all duration-150 active:scale-[0.98] ${
                    active ? "bg-grape text-white" : "text-ink hover:bg-lilac"
                  }`}
                >
                  <Icon size={18} /> <span className="flex-1">{label}</span>
                  <CountBadge count={count} label={`${count} new in ${label}`} />
                  <LinkSpinner className="size-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );

  return (
    <nav aria-label="Room sections" className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      <ul className="flex w-max gap-2">
        {tabs.map(({ href, label, icon: Icon, match, section }) => {
          const active = match ? match(path) : path.startsWith(href);
          const count = active ? 0 : (updates[section] ?? 0);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`btn btn-sm ${active ? "btn-primary" : ""}`}>
                <Icon size={16} /> {label}
                <CountBadge count={count} />
                <LinkSpinner className="size-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

