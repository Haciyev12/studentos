'use client'

import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEADLINE_TYPE_DOT, DEADLINE_TYPE_LABELS, DEADLINE_TYPE_STYLES, type Deadline } from '@/types'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [deadlines, setDeadlines] = useState<(Deadline & { course_name?: string; course_color?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('deadlines')
        .select('*, course:courses(name, color)')
        .order('due_date', { ascending: true })
      setDeadlines(
        (data ?? []).map((d) => ({
          ...d,
          course_name: (d.course as any)?.name,
          course_color: (d.course as any)?.color,
        }))
      )
      setLoading(false)
    }
    fetch()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDow = startOfMonth(currentDate).getDay()
    const daysInMonth = getDaysInMonth(currentDate)
    const cells: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [currentDate])

  const deadlinesByDay = useMemo(() => {
    const map: Record<number, typeof deadlines> = {}
    for (const d of deadlines) {
      const date = new Date(d.due_date + 'T00:00:00')
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate()
        ;(map[day] ??= []).push(d)
      }
    }
    return map
  }, [deadlines, year, month])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = today.getDate()

  const selectedDeadlines = selected
    ? deadlinesByDay[parseInt(selected)] ?? []
    : []

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">All your deadlines in one view</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
            className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-3 py-1.5 text-xs border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
        {/* Calendar grid */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {DAYS.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center text-xs font-medium text-zinc-500"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-24 border-b border-r border-zinc-800/50 last:border-r-0" />
              }
              const dayDeadlines = deadlinesByDay[day] ?? []
              const isToday = isCurrentMonth && day === todayDate
              const isSelected = selected === String(day)
              return (
                <button
                  key={day}
                  onClick={() => setSelected(selected === String(day) ? null : String(day))}
                  className={cn(
                    'h-24 p-1.5 border-b border-r border-zinc-800/50 text-left align-top transition-colors hover:bg-zinc-800/50',
                    (i + 1) % 7 === 0 && 'border-r-0',
                    isSelected && 'bg-indigo-500/5 border-indigo-500/20'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium flex items-center justify-center w-5 h-5 rounded-full mb-1',
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400'
                    )}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayDeadlines.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-1 px-1 rounded"
                        style={{ backgroundColor: (d.course_color ?? '#6366F1') + '20' }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.course_color ?? '#6366F1' }}
                        />
                        <span className="text-[10px] truncate leading-4" style={{ color: d.course_color ?? '#6366F1' }}>
                          {d.title}
                        </span>
                      </div>
                    ))}
                    {dayDeadlines.length > 3 && (
                      <p className="text-[10px] text-zinc-600 px-1">
                        +{dayDeadlines.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div>
          {selected && selectedDeadlines.length > 0 ? (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-semibold">
                  {format(new Date(year, month, parseInt(selected)), 'MMMM d')}
                </p>
                <p className="text-xs text-zinc-500">{selectedDeadlines.length} deadline{selectedDeadlines.length !== 1 ? 's' : ''}</p>
              </div>
              <ul className="divide-y divide-zinc-800/60">
                {selectedDeadlines.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: d.course_color ?? '#6366F1' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-medium truncate', d.completed && 'line-through text-zinc-500')}>
                          {d.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{d.course_name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', DEADLINE_TYPE_STYLES[d.type])}>
                            {DEADLINE_TYPE_LABELS[d.type]}
                          </span>
                          {d.weight != null && (
                            <span className="text-xs text-zinc-500">{d.weight}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-500">Click a day to see deadlines</p>

              {/* Legend */}
              <div className="mt-6 text-left space-y-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Types</p>
                {(['exam', 'quiz', 'assignment', 'project', 'other'] as const).map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', DEADLINE_TYPE_DOT[t])} />
                    <span className="text-xs text-zinc-400">{DEADLINE_TYPE_LABELS[t]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
