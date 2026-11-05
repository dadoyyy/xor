import { Logo } from "@/components/Mascot";

/** Generic content placeholder: a heading line and a grid of cards. */
export function ContentSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="page-in" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-20" />
            <div className="skeleton mt-4 h-5 w-2/3" />
            <div className="skeleton mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full page placeholder with a top bar, used before a room or the rooms list loads. */
export function PageSkeleton() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-line bg-white/90 backdrop-blur">
        <div className="page-x flex h-16 w-full items-center justify-between">
          <Logo size={32} />
          <div className="skeleton h-9 w-32 rounded-full" />
        </div>
      </header>
      <main className="page-x pb-20 pt-8 lg:pt-10">
        <ContentSkeleton cards={8} />
      </main>
    </>
  );
}
