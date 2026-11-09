import Link from "next/link";
import Mascot from "@/components/ui/Mascot";

export const metadata = { title: "xor" };
export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-lilac items-center justify-center px-4 text-center">
      <Mascot size={110} mood="sleepy" />
      <h1 className="mt-4 text-3xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-ink-soft">xor needs an internet connection to load your subjects. Reconnect and try again.</p>
      <Link href="/subjects" className="btn btn-primary mt-6">
        Try again
      </Link>
    </main>
  );
}

