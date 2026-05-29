import { createClient } from '@/lib/supabase/server'
import { formatDeadlineDate, getDaysUntil, formatRelativeDate } from '@/lib/utils'
import { DEADLINE_TYPE_STYLES, DEADLINE_TYPE_LABELS } from '@/types'
import { format } from 'date-fns'
import { AlertCircle, BookMarked, Clock, FileUp, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: upcomingDeadlines }, { data: recentSyllabi }, { data: profile }, { data: grades }] =
    await Promise.all([
      supabase
        .from('deadlines')
        .select('*, course:courses(name, color, code)')
        .eq('user_id', user!.id)
        .eq('completed', false)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(8),
      supabase
        .from('syllabi')
        .select('*, course:courses(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
      supabase.from('grades').select('grade_points, credits').eq('user_id', user!.id),
    ])

  const cumulativeGpa = (() => {
    if (!grades?.length) return null
    const tp = grades.reduce((s, g) => s + g.grade_points * g.credits, 0)
    const tc = grades.reduce((s, g) => s + g.credits, 0)
    return tc > 0 ? tp / tc : null
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={String(upcomingDeadlines?.length ?? 0)}
          sub="deadlines"
          color="indigo"
        />
        <StatCard
          icon={FileUp}
          label="Syllabi"
          value={String(recentSyllabi?.length ?? 0)}
          sub="uploaded"
          color="violet"
        />
        <StatCard
          icon={TrendingUp}
          label="GPA"
          value={cumulativeGpa !== null ? cumulativeGpa.toFixed(2) : '—'}
          sub={cumulativeGpa !== null ? 'cumulative' : 'add grades'}
          color="emerald"
          href="/gpa"
        />
        <StatCard icon={BookMarked} label="Courses" value={String(recentSyllabi?.length ?? 0)} sub="with syllabi" color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Upcoming deadlines */}
        <div className="md:col-span-3 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming deadlines</h2>
            <Link href="/calendar" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              View calendar →
            </Link>
          </div>
          {!upcomingDeadlines?.length ? (
            <EmptyState
              icon={Clock}
              message="No upcoming deadlines"
              sub="Upload a syllabus to get started"
            />
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {upcomingDeadlines.map((d) => {
                const days = getDaysUntil(d.due_date)
                const urgent = days <= 3
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: (d.course as any)?.color ?? '#6366F1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-zinc-100">{d.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {(d.course as any)?.code ?? (d.course as any)?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md ${DEADLINE_TYPE_STYLES[d.type as keyof typeof DEADLINE_TYPE_STYLES]}`}
                      >
                        {DEADLINE_TYPE_LABELS[d.type as keyof typeof DEADLINE_TYPE_LABELS]}
                      </span>
                      <span
                        className={`text-xs font-medium ${urgent ? 'text-red-400' : 'text-zinc-400'}`}
                      >
                        {formatDeadlineDate(d.due_date)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent uploads */}
        <div className="md:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent uploads</h2>
            <Link href="/courses" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              All courses →
            </Link>
          </div>
          {!recentSyllabi?.length ? (
            <EmptyState
              icon={FileUp}
              message="No uploads yet"
              sub="Go to Courses to upload a syllabus"
            />
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {recentSyllabi.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <FileUp className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-zinc-200">{s.file_name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {(s.course as any)?.name}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 pl-5">
                    {formatRelativeDate(s.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Overdue warning */}
      {await OverdueAlert(supabase, user!.id, today)}
    </div>
  )
}

async function OverdueAlert(supabase: ReturnType<typeof createClient>, userId: string, today: string) {
  const { data } = await supabase
    .from('deadlines')
    .select('id')
    .eq('user_id', userId)
    .eq('completed', false)
    .lt('due_date', today)
    .limit(1)

  if (!data?.length) return null

  return (
    <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
      <AlertCircle className="w-4 h-4 shrink-0" />
      You have overdue deadlines.{' '}
      <Link href="/calendar" className="underline underline-offset-2 hover:text-red-300">
        Review them →
      </Link>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: string
  href?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
  }
  const inner = (
    <>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">
        <span className="text-zinc-400">{label}</span> {sub}
      </p>
    </>
  )
  if (href) {
    return (
      <Link href={href} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors block">
        {inner}
      </Link>
    )
  }
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      {inner}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${map[status] ?? map.pending} shrink-0`}>
      {status}
    </span>
  )
}

function EmptyState({
  icon: Icon,
  message,
  sub,
}: {
  icon: React.ElementType
  message: string
  sub: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <Icon className="w-8 h-8 text-zinc-700 mb-3" />
      <p className="text-sm text-zinc-400">{message}</p>
      <p className="text-xs text-zinc-600 mt-1">{sub}</p>
    </div>
  )
}
