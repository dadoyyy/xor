import Link from "next/link";
import { Logo } from "@/components/Mascot";
import UserMenu from "@/components/UserMenu";

/** Uses the shared page gutter, so it lines up with every page's content. */
export default function TopBar({ username, leading }: { username: string; leading?: React.ReactNode }) {
  const pad = "page-x";
  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-white/90 backdrop-blur">
      <div className={`${pad} flex h-16 w-full items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          {leading}
          <Link href="/rooms" aria-label="Your rooms" className={`flex items-center ${leading ? "" : "-ml-0.5"}`}>
            <Logo size={32} />
          </Link>
        </div>
        <UserMenu username={username} />
      </div>
    </header>
  );
}
