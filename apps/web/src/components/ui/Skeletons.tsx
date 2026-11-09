import CorgiLoader from "@/components/mascot/CorgiLoader";

/** Generic content placeholder: centered Corgi loading screen. */
export function ContentSkeleton({ cards: _cards = 6 }: { cards?: number }) {
  return (
    <div
      className="page-in flex min-h-[60dvh] w-full flex-col items-center justify-center px-6 py-12 text-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <CorgiLoader variant="default" size={140} />
    </div>
  );
}

/** Full page placeholder used before a room or the rooms dashboard loads. */
export function PageSkeleton() {
  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center bg-lilac px-4 py-12"
      aria-busy="true"
      aria-label="Loading"
    >
      <CorgiLoader variant="default" size={140} />
    </div>
  );
}

const Back = () => <div className="skeleton h-4 w-24 rounded" />;

/** Section with a title, a button on the right, and a list of rows (quizzes, decks). */
export function ListSkeleton({ rows = 5, grid = false }: { rows?: number; grid?: boolean }) {
  return (
    <div className="page-in grid gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-8 w-44" />
        <div className="skeleton h-10 w-32 rounded-full" />
      </div>
      <div className={grid ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4 p-4">
            <div className="skeleton size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Quiz details page: info card + leaderboard. */
export function DetailSkeleton() {
  return (
    <div className="page-in grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading">
      <div className="grid content-start gap-5">
        <Back />
        <div className="card p-5 sm:p-6">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton mt-3 h-4 w-1/2" />
          <div className="mt-4 flex gap-2">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton mt-6 h-12 w-40 rounded-full" />
        </div>
      </div>
      <div className="card p-5">
        <div className="skeleton h-6 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton mt-3 h-10" />
        ))}
      </div>
    </div>
  );
}

/** Flashcard deck: back link, title, one big card. */
export function DeckSkeleton() {
  return (
    <div className="page-in" aria-busy="true" aria-label="Loading">
      <Back />
      <div className="skeleton mt-3 h-8 w-1/2" />
      <div className="skeleton mx-auto mt-8 h-72 max-w-2xl rounded-3xl sm:h-80" />
      <div className="mx-auto mt-5 flex max-w-2xl justify-between">
        <div className="skeleton h-10 w-24 rounded-full" />
        <div className="skeleton h-10 w-24 rounded-full" />
      </div>
    </div>
  );
}

/** "New quiz" / "New deck" forms. */
export function FormSkeleton() {
  return (
    <div className="page-in" aria-busy="true" aria-label="Loading">
      <Back />
      <div className="skeleton mt-3 h-8 w-48" />
      <div className="card mt-6 grid gap-5 p-5 sm:p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton mt-2 h-11" />
          </div>
        ))}
        <div className="skeleton h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}

/** Taking a quiz: progress bar + question stage. */
export function QuizSkeleton() {
  return (
    <div className="page-in" aria-busy="true" aria-label="Loading quiz">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-9 w-24 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-2.5 rounded-full" />
      <div className="quiz-stage mt-6 rounded-3xl p-4 sm:p-8">
        <div className="card mx-auto max-w-3xl p-5 sm:p-7">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton mt-3 h-7 w-5/6" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quiz results: score card + answer cards. */
export function ResultsSkeleton() {
  return (
    <div className="page-in grid gap-5" aria-busy="true" aria-label="Loading results">
      <Back />
      <div className="card flex flex-col items-center gap-3 p-6 sm:flex-row sm:gap-6">
        <div className="skeleton size-24 shrink-0 rounded-full" />
        <div className="w-full">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton mt-2 h-4 w-64 max-w-full" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton mt-3 h-4 w-1/2" />
          <div className="skeleton mt-3 h-16" />
        </div>
      ))}
    </div>
  );
}

/** Members: room card + member grid. */
export function MembersSkeleton() {
  return (
    <div className="page-in grid gap-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-36" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-3 p-4">
            <div className="skeleton size-11 shrink-0 rounded-full" />
            <div className="flex-1">
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton mt-2 h-3.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Leaderboard: list of ranked rows + side card. */
export function BoardSkeleton() {
  return (
    <div className="page-in grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true" aria-label="Loading">
      <div>
        <div className="skeleton h-8 w-56" />
        <div className="skeleton mt-2 h-4 w-80 max-w-full" />
        <div className="mt-4 grid gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="skeleton h-48 rounded-3xl" />
    </div>
  );
}

