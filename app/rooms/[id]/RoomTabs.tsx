"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Layers, ListChecks, Trophy, Users } from "lucide-react";

export default function RoomTabs({ roomId, vertical = false }: { roomId: string; vertical?: boolean }) {
  const path = usePathname();
  const base = `/rooms/${roomId}`;
  const tabs = [
    { href: base, label: "Materials", icon: FileText, match: (p: string) => p === base },
    { href: `${base}/flashcards`, label: "Flashcards", icon: Layers },
    { href: `${base}/quizzes`, label: "Quizzes", icon: ListChecks },
    { href: `${base}/leaderboard`, label: "Leaderboard", icon: Trophy },
    { href: `${base}/members`, label: "Members", icon: Users },
  ];

  if (vertical)
    return (
      <nav aria-label="Room sections">
        <ul className="grid gap-1.5">
          {tabs.map(({ href, label, icon: Icon, match }) => {
            const active = match ? match(path) : path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-display font-semibold transition-colors ${
                    active ? "bg-grape text-white shadow-[0_4px_0_var(--grape-deep)]" : "text-ink hover:bg-white"
                  }`}
                >
                  <Icon size={18} /> {label}
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
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match ? match(path) : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`btn btn-sm ${active ? "btn-primary" : ""}`}>
                <Icon size={16} /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
