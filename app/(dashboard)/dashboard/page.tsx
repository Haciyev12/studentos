'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { AlertCircle, BookMarked, Calendar, Check, Clock, FileUp, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDeadlineDate, getDaysUntil, formatRelativeDate } from '@/lib/utils'
import { DEADLINE_TYPE_STYLES, DEADLINE_TYPE_LABELS } from '@/types'
import { AnimatedNumber } from '@/components/ui/stat-counter'

type DeadlineRow = { id: string; title: string; type: string; due_date: string; completed: boolean; course?: { name?: string; code?: string; color?: string } | null }
type SyllabiRow = { id: string; file_name: string; status: string; created_at: string; course?: { name?: string } | null }

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const cardItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export default function DashboardPage() {
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([])
  const [syllabi, setSyllabi] = useState<SyllabiRow[]>([])
  const [gpa, setGpa] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [overdueCount, setOverdueCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email ?? '')
    const today = new Date().toISOString().split('T')[0]

    const [{ data: dl }, { data: sy }, { data: grades }, { data: overdue }, { data: uc }] = await Promise.all([
      supabase.from('deadlines').select('id, title, type, due_date, completed, course:courses(name, code, color)').eq('user_id', user.id).eq('completed', false).gte('due_date', today).order('due_date', { ascending: true }).limit(8) as any,
      supabase.from('syllabi').select('id, file_name, status, created_at, course:courses(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4) as any,
      supabase.from('grades').select('grade_points, credits').eq('user_id', user.id).eq('in_progress', false),
      supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', false).lt('due_date', today),
      supabase.rpc('get_total_user_count').single(),
    ])

    const tp = grades?.reduce((s, g) => s + g.grade_points * g.credits, 0) ?? 0
    const tc = grades?.reduce((s, g) => s + g.credits, 0) ?? 0

    setDeadlines(dl ?? [])
    setSyllabi(sy ?? [])
    setGpa(tc > 0 ? tp / tc : null)
    setOverdueCount(overdue?.length ?? 0)
    setUserCount(Number(uc) || 0)
    setLoading(false)
  }

  async function markComplete(id: string) {
    setCompletingId(id)
    setFlashId(id)
    const supabase = createClient()
    await supabase.from('deadlines').update({ completed: true }).eq('id', id)
    setTimeout(() => {
      setDeadlines(prev => prev.filter(d => d.id !== id))
      setCompletingId(null)
      setFlashId(null)
      toast.success('Deadline marked complete')
    }, 600)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = email.split('@')[0] ?? 'there'

  const stats = [
    { icon: Clock, label: 'Upcoming', value: deadlines.length, sub: 'deadlines', color: 'indigo' },
    { icon: FileUp, label: 'Syllabi', value: syllabi.length, sub: 'uploaded', color: 'violet' },
    { icon: TrendingUp, label: 'GPA', value: gpa ?? 0, sub: gpa !== null ? 'cumulative' : 'add grades', color: 'emerald', decimals: 2, href: '/gpa', dash: gpa === null },
    { icon: Users, label: 'Students', value: userCount, sub: 'using ADA Scholar', color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">
      <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 h-64 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        <div className="md:col-span-2 h-64 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </motion.div>

      {/* Stat cards with stagger */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map(({ icon: Icon, label, value, sub, color, decimals, href, dash }) => {
          const inner = (
            <>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
                {dash ? '—' : <AnimatedNumber value={value} decimals={decimals ?? 0} />}
              </p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                <span className="text-gray-600 dark:text-zinc-400">{label}</span> {sub}
              </p>
            </>
          )
          const base = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 shadow-sm'
          return (
            <motion.div key={label} variants={cardItem}>
              {href
                ? <Link href={href} className={`${base} hover:border-indigo-300 dark:hover:border-zinc-700 block transition-colors`}>{inner}</Link>
                : <div className={base}>{inner}</div>}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Main content */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Deadline list */}
        <motion.div variants={cardItem} className="md:col-span-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Upcoming deadlines</h2>
            <Link href="/calendar" className="text-xs text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-300 transition-colors">View calendar →</Link>
          </div>
          {deadlines.length === 0 ? (
            <EmptyDeadlines />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800/60">
              <AnimatePresence initial={false}>
                {deadlines.map((d, i) => {
                  const days = getDaysUntil(d.due_date)
                  const urgent = days <= 3
                  const isFlashing = flashId === d.id
                  const isCompleting = completingId === d.id

                  return (
                    <motion.li
                      key={d.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isCompleting ? 0.5 : 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.04 }}
                      className={`group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors relative ${isFlashing ? 'animate-complete-flash' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (d.course as any)?.color ?? '#6366F1' }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate text-gray-900 dark:text-zinc-100 transition-all duration-300 ${isCompleting ? 'line-through text-gray-400 dark:text-zinc-500' : ''}`}>
                          {d.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{(d.course as any)?.code ?? (d.course as any)?.name}</p>
                      </div>

                      {/* Normal state */}
                      <div className="flex items-center gap-2 shrink-0 group-hover:opacity-0 group-hover:translate-x-2 transition-all duration-200">
                        <span className={`text-xs px-2 py-0.5 rounded-md ${DEADLINE_TYPE_STYLES[d.type as keyof typeof DEADLINE_TYPE_STYLES]}`}>
                          {DEADLINE_TYPE_LABELS[d.type as keyof typeof DEADLINE_TYPE_LABELS]}
                        </span>
                        <span className={`text-xs font-medium ${urgent ? 'text-red-500 animate-overdue' : 'text-gray-400 dark:text-zinc-400'}`}>
                          {formatDeadlineDate(d.due_date)}
                        </span>
                      </div>

                      {/* Hover quick actions — slide in from right */}
                      <div className="absolute right-5 flex items-center gap-1.5 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                        <button
                          onClick={() => markComplete(d.id)}
                          disabled={!!completingId}
                          title="Mark complete"
                          className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <Link href="/calendar" title="View in calendar" className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-sm">
                          <Calendar className="w-3 h-3" />
                        </Link>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>

        {/* Recent uploads */}
        <motion.div variants={cardItem} className="md:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Recent uploads</h2>
            <Link href="/courses" className="text-xs text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-300 transition-colors">All courses →</Link>
          </div>
          {syllabi.length === 0 ? (
            <EmptyUploads />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800/60">
              {syllabi.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                  className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <FileUp className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-gray-700 dark:text-zinc-200">{s.file_name}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{(s.course as any)?.name}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-gray-300 dark:text-zinc-600 mt-1 pl-5">{formatRelativeDate(s.created_at)}</p>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>

      {/* Overdue alert */}
      <AnimatePresence>
        {overdueCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ delay: 0.3 }}
            className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            You have {overdueCount} overdue deadline{overdueCount > 1 ? 's' : ''}.{' '}
            <Link href="/calendar" className="underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300">Review them →</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyDeadlines() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="animate-float mb-4">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mx-auto">
          <rect x="10" y="14" width="52" height="48" rx="6" fill="currentColor" className="text-indigo-100 dark:text-indigo-900/40" />
          <rect x="10" y="14" width="52" height="48" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-indigo-200 dark:text-indigo-700" />
          <rect x="18" y="8" width="4" height="12" rx="2" fill="currentColor" className="text-indigo-300 dark:text-indigo-600" />
          <rect x="50" y="8" width="4" height="12" rx="2" fill="currentColor" className="text-indigo-300 dark:text-indigo-600" />
          <rect x="18" y="30" width="36" height="2" rx="1" fill="currentColor" className="text-indigo-200 dark:text-indigo-700" />
          <rect x="18" y="38" width="24" height="2" rx="1" fill="currentColor" className="text-indigo-200 dark:text-indigo-700" />
          <circle cx="50" cy="50" r="11" fill="currentColor" className="text-green-500" />
          <path d="M45 50l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">All clear!</p>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">No upcoming deadlines. Upload a syllabus to get started.</p>
      <Link href="/courses" className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Go to Courses →</Link>
    </div>
  )
}

function EmptyUploads() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="animate-float mb-4">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto">
          <rect x="10" y="12" width="38" height="46" rx="4" fill="currentColor" className="text-violet-100 dark:text-violet-900/40" />
          <rect x="10" y="12" width="38" height="46" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-violet-200 dark:text-violet-700" />
          <rect x="18" y="24" width="22" height="2" rx="1" fill="currentColor" className="text-violet-200 dark:text-violet-700" />
          <rect x="18" y="31" width="16" height="2" rx="1" fill="currentColor" className="text-violet-200 dark:text-violet-700" />
          <circle cx="48" cy="22" r="12" fill="currentColor" className="text-violet-500" />
          <path d="M48 28v-8M44 22l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">No uploads yet</p>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Upload a syllabus PDF and AI will extract your deadlines.</p>
      <Link href="/courses" className="mt-3 text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline">Upload syllabus →</Link>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    processing: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    failed:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    pending:    'bg-gray-100 dark:bg-zinc-500/10 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-500/20',
  }
  return <span className={`text-xs px-1.5 py-0.5 rounded border ${map[status] ?? map.pending} shrink-0`}>{status}</span>
}
