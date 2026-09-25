/** Shown while the game route loads: a slim bar and Ollie clocking in. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-paper" role="status">
      <div className="h-[52px] flex-none border-b-2 border-ink" />
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/game/sprites/ollie-eager.svg"
            alt=""
            width={220}
            height={220}
            className="hl-bob mx-auto h-28 w-28"
          />
          <p className="mt-3 font-display text-lg font-semibold text-ink">Clocking in…</p>
        </div>
      </div>
    </div>
  );
}
