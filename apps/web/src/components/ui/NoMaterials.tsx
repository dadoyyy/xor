import Link from "next/link";
import Mascot from "@/components/ui/Mascot";

export default function NoMaterials({ roomId }: { roomId: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <Mascot size={80} mood="sleepy" />
      <p className="mt-3 font-display text-lg font-semibold">Upload a PDF first</p>
      <p className="max-w-sm text-sm text-ink-soft">
        Flashcards and quizzes are made from this room&apos;s study materials. Once a file shows Ready, you can start.
      </p>
      <Link href={`/rooms/${roomId}`} className="btn btn-primary mt-4">
        Go to materials
      </Link>
    </div>
  );
}

