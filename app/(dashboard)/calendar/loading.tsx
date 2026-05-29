export default function CalendarLoading() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-zinc-800 rounded-lg mb-2" />
          <div className="h-4 w-40 bg-zinc-800/60 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-zinc-800 rounded-lg" />
          <div className="h-9 w-32 bg-zinc-800 rounded-lg" />
          <div className="h-9 w-9 bg-zinc-800 rounded-lg" />
        </div>
      </div>
      <div className="h-[500px] rounded-xl bg-zinc-900 border border-zinc-800" />
    </div>
  )
}
