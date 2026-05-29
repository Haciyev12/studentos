export default function CoursesLoading() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-zinc-800 rounded-lg mb-2" />
          <div className="h-4 w-48 bg-zinc-800/60 rounded" />
        </div>
        <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
      </div>
      <div className="grid gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800" />
        ))}
      </div>
    </div>
  )
}
