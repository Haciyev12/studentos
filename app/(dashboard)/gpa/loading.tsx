export default function GpaLoading() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-36 bg-zinc-800 rounded-lg mb-2" />
        <div className="h-4 w-52 bg-zinc-800/60 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800" />
        <div className="h-64 rounded-xl bg-zinc-900 border border-zinc-800" />
      </div>
    </div>
  )
}
