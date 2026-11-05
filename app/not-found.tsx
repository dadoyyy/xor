import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-lilac items-center justify-center px-4 text-center">
      <Mascot size={110} mood="think" />
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-soft">That link doesn&apos;t go anywhere. Head back to your rooms.</p>
      <Link href="/rooms" className="btn btn-primary mt-6">
        Go to your rooms
      </Link>
    </main>
  );
}
