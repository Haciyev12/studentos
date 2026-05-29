export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10 animate-pulse">
      <div className="mb-10">
        <div className="h-7 w-48 bg-zinc-800 rounded-lg mb-2" />
        <div className="h-4 w-36 bg-zinc-800/60 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 h-24" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 rounded-xl bg-zinc-900 border border-zinc-800 h-64" />
        <div className="md:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 h-64" />
      </div>
    </div>
  )
}
