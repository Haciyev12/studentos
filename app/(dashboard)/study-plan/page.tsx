'use client'

import { useEffect, useState } from 'react'
import { Brain, RefreshCw, Sparkles, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Deadline = {
  id: string
  title: string
  type: string
  due_date: string
  priority: string
  course: { name: string; code: string | null } | null
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h3 key={i} className="text-sm font-semibold text-zinc-100 mt-5 first:mt-0 pt-3 border-t border-zinc-800 first:border-0 first:pt-0">
              {line.replace(/\*\*/g, '')}
            </h3>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-sm text-zinc-300 pl-2">
              <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-zinc-400">{line}</p>
      })}
    </div>
  )
}

export default function StudyPlanPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [schedule, setSchedule] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingDeadlines, setLoadingDeadlines] = useState(true)
  const [deadlineCount, setDeadlineCount] = useState(0)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const in14 = new Date()
    in14.setDate(in14.getDate() + 14)
    const in14Str = in14.toISOString().split('T')[0]

    fetch(`/api/deadlines?from=${today}&to=${in14Str}`)
      .then((r) => r.json())
      .then((d) => {
        setDeadlines(Array.isArray(d) ? d.slice(0, 10) : [])
        setLoadingDeadlines(false)
      })
      .catch(() => setLoadingDeadlines(false))
  }, [])

  async function generateSchedule() {
    setGenerating(true)
    setSchedule(null)
    try {
      const res = await fetch('/api/study-schedule', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSchedule(data.schedule)
      setDeadlineCount(data.deadlineCount)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate schedule')
    } finally {
      setGenerating(false)
    }
  }

  const priorityColor: Record<string, string> = {
    high: 'text-red-400',
    medium: 'text-amber-400',
    low: 'text-zinc-500',
  }

  const typeStyles: Record<string, string> = {
    exam: 'bg-red-500/10 text-red-400',
    quiz: 'bg-orange-500/10 text-orange-400',
    assignment: 'bg-blue-500/10 text-blue-400',
    project: 'bg-violet-500/10 text-violet-400',
    other: 'bg-zinc-500/10 text-zinc-400',
  }

  function daysUntil(date: string) {
    const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `${diff}d`
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">AI Study Plan</h1>
        <p className="text-sm text-zinc-500 mt-1">
          AI analyzes your upcoming deadlines and creates a personalized study schedule
        </p>
      </div>

      {/* Upcoming deadlines preview */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold">Upcoming deadlines (next 14 days)</h2>
        </div>
        {loadingDeadlines ? (
          <div className="px-5 py-8 text-center">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : !deadlines.length ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No upcoming deadlines</p>
            <p className="text-xs text-zinc-600 mt-1">Upload a syllabus in Courses to add deadlines</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {deadlines.map((d) => {
              const days = daysUntil(d.due_date)
              const urgent = days === 'Today' || days === 'Tomorrow' || (typeof days === 'string' && parseInt(days) <= 3)
              return (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-zinc-100">{d.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{d.course?.code ?? d.course?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${typeStyles[d.type] ?? typeStyles.other}`}>
                      {d.type}
                    </span>
                    {d.priority === 'high' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${urgent ? 'text-red-400' : 'text-zinc-400'}`}>
                      {days}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Generate button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={generateSchedule}
          disabled={generating}
          className="flex items-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating your plan…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {schedule ? 'Regenerate Study Plan' : 'Generate AI Study Plan'}
            </>
          )}
        </button>
      </div>

      {/* Schedule output */}
      {schedule && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold">Your Study Plan</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                Based on {deadlineCount} deadline{deadlineCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={generateSchedule}
                disabled={generating}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="px-5 py-5">
            <MarkdownContent content={schedule} />
          </div>
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-zinc-600 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              AI-generated plan — adjust based on your actual availability and learning pace
            </p>
          </div>
        </div>
      )}

      {!schedule && !generating && (
        <div className="rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center py-16 text-center">
          <Brain className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No study plan yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Click &ldquo;Generate AI Study Plan&rdquo; to get a personalized schedule
          </p>
        </div>
      )}
    </div>
  )
}
