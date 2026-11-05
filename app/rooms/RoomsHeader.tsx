import RoomActions from "./RoomActions";

/** Greeting on the left, join/create box on the right, centered on one row. */
export default function RoomsHeader({ username }: { username: string }) {
  return (
    <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
      <div className="min-w-0">
        <h1 className="truncate text-4xl font-bold sm:text-5xl">Hi, {username}!</h1>
        <p className="mt-1 text-lg text-ink-soft">Pick a room, or start a new one.</p>
      </div>
      <div className="w-full lg:max-w-[36rem] xl:max-w-[40rem]">
        <RoomActions />
      </div>
    </section>
  );
}
