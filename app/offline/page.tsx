import Mascot from "@/components/Mascot";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-lilac items-center justify-center px-4 text-center">
      <Mascot size={110} mood="sleepy" />
      <h1 className="mt-4 text-3xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-ink-soft">xor needs an internet connection to load your rooms. Reconnect and try again.</p>
      <a href="/rooms" className="btn btn-primary mt-6">
        Try again
      </a>
    </main>
  );
}
