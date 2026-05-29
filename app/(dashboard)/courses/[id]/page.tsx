'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  DEADLINE_TYPE_LABELS,
  DEADLINE_TYPE_STYLES,
  type Course,
  type Deadline,
  type DeadlineType,
  type Syllabus,
} from '@/types'
import { cn, formatRelativeDate } from '@/lib/utils'

const DEADLINE_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [syllabi, setSyllabi] = useState<Syllabus[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  async function fetchAll() {
    const [{ data: c }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('syllabi').select('*').eq('course_id', id).order('created_at', { ascending: false }),
      supabase.from('deadlines').select('*').eq('course_id', id).order('due_date', { ascending: true }),
    ])
    if (!c) { router.push('/courses'); return }
    setCourse(c)
    setSyllabi(s ?? [])
    setDeadlines(d ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  async function handleUpload(file: File) {
    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20 MB')
      return
    }

    setUploading(true)
    const toastId = toast.loading('Uploading and extracting deadlines…')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('course_id', id)

      const res = await fetch('/api/extract-syllabus', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Extraction failed')

      toast.success(`Extracted ${json.count} deadline${json.count !== 1 ? 's' : ''}`, { id: toastId })
      fetchAll()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
      </div>
    )
  }

  if (!course) return null

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Back */}
      <button
        onClick={() => router.push('/courses')}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to courses
      </button>

      {/* Course header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: course.color }}
        >
          {course.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{course.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {[course.code, course.professor, course.semester].filter(Boolean).join(' · ')}
            {course.credits && ` · ${course.credits} credits`}
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Syllabus
        </h2>
        <div
          className={cn(
            'relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
            dragOver
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40',
            uploading && 'pointer-events-none opacity-60'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={onFileChange} style={{ display: 'none' }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm text-zinc-400">AI is reading your syllabus…</p>
              <p className="text-xs text-zinc-600">This takes 10–30 seconds</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-1">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-zinc-300">
                Drop your syllabus PDF here
              </p>
              <p className="text-xs text-zinc-500">or click to browse · max 20 MB</p>
            </div>
          )}
        </div>

        {/* Uploaded syllabi */}
        {syllabi.length > 0 && (
          <div className="mt-3 space-y-2">
            {syllabi.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800"
              >
                <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-zinc-200">{s.file_name}</p>
                  <p className="text-xs text-zinc-600">{formatRelativeDate(s.created_at)}</p>
                </div>
                <SyllabusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deadlines */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Deadlines ({deadlines.length})
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add manually
          </button>
        </div>

        {showAddForm && (
          <AddDeadlineForm
            courseId={id}
            onSave={() => { setShowAddForm(false); fetchAll() }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {deadlines.length === 0 && !showAddForm ? (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">No deadlines extracted yet</p>
            <p className="text-xs text-zinc-600 mt-1">Upload a syllabus above to extract deadlines automatically</p>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-2.5 border-b border-zinc-800 gap-3">
              <span>Title</span>
              <span className="w-20 text-center">Type</span>
              <span className="w-24 text-right">Due date</span>
              <span className="w-16 text-right">Weight</span>
            </div>
            <ul className="divide-y divide-zinc-800/60">
              {deadlines.map((deadline) =>
                editingId === deadline.id ? (
                  <EditDeadlineRow
                    key={deadline.id}
                    deadline={deadline}
                    onSave={() => { setEditingId(null); fetchAll() }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <DeadlineRow
                    key={deadline.id}
                    deadline={deadline}
                    onEdit={() => setEditingId(deadline.id)}
                    onDelete={async () => {
                      await supabase.from('deadlines').delete().eq('id', deadline.id)
                      fetchAll()
                    }}
                    onToggle={async () => {
                      await supabase
                        .from('deadlines')
                        .update({ completed: !deadline.completed })
                        .eq('id', deadline.id)
                      fetchAll()
                    }}
                  />
                )
              )}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

function DeadlineRow({
  deadline,
  onEdit,
  onDelete,
  onToggle,
}: {
  deadline: Deadline
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const isPast = new Date(deadline.due_date + 'T00:00:00') < new Date()
  return (
    <li className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggle}
          className={cn(
            'shrink-0 w-4 h-4 rounded border transition-colors',
            deadline.completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-zinc-600 hover:border-zinc-400'
          )}
        >
          {deadline.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm truncate',
              deadline.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
            )}
          >
            {deadline.title}
          </p>
          {deadline.description && (
            <p className="text-xs text-zinc-600 truncate mt-0.5">{deadline.description}</p>
          )}
        </div>
      </div>
      <div className="w-20 flex justify-center">
        <span className={cn('text-xs px-2 py-0.5 rounded-md', DEADLINE_TYPE_STYLES[deadline.type])}>
          {DEADLINE_TYPE_LABELS[deadline.type]}
        </span>
      </div>
      <div className="w-24 text-right">
        <span
          className={cn(
            'text-xs',
            isPast && !deadline.completed ? 'text-red-400' : 'text-zinc-400'
          )}
        >
          {format(new Date(deadline.due_date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
      </div>
      <div className="w-16 flex items-center justify-end gap-1">
        <span className="text-xs text-zinc-500">
          {deadline.weight != null ? `${deadline.weight}%` : '—'}
        </span>
        <div className="hidden group-hover:flex items-center gap-1 ml-1">
          <button
            onClick={onEdit}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </li>
  )
}

function EditDeadlineRow({
  deadline,
  onSave,
  onCancel,
}: {
  deadline: Deadline
  onSave: () => void
  onCancel: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(deadline.title)
  const [type, setType] = useState<DeadlineType>(deadline.type)
  const [dueDate, setDueDate] = useState(deadline.due_date)
  const [weight, setWeight] = useState(deadline.weight?.toString() ?? '')
  const [description, setDescription] = useState(deadline.description ?? '')

  async function save() {
    if (!title || !dueDate) return
    setSaving(true)
    const { error } = await supabase
      .from('deadlines')
      .update({
        title,
        type,
        due_date: dueDate,
        weight: weight ? parseFloat(weight) : null,
        description: description || null,
        manually_edited: true,
      })
      .eq('id', deadline.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    onSave()
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors w-full'

  return (
    <li className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div className="col-span-2 md:col-span-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputCls}
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DeadlineType)}
          className={inputCls}
        >
          {DEADLINE_TYPES.map((t) => (
            <option key={t} value={t}>
              {DEADLINE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputCls}
        />
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Weight %"
          type="number"
          min={0}
          max={100}
          step={0.5}
          className={inputCls}
        />
        <div className="col-span-2 md:col-span-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-md text-xs font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </li>
  )
}

function AddDeadlineForm({
  courseId,
  onSave,
  onCancel,
}: {
  courseId: string
  onSave: () => void
  onCancel: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<DeadlineType>('assignment')
  const [dueDate, setDueDate] = useState('')
  const [weight, setWeight] = useState('')

  async function save() {
    if (!title || !dueDate) { toast.error('Title and due date are required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('deadlines').insert({
      course_id: courseId,
      user_id: user!.id,
      title,
      type,
      due_date: dueDate,
      weight: weight ? parseFloat(weight) : null,
      manually_edited: true,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    onSave()
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors w-full placeholder:text-zinc-600'

  return (
    <div className="mb-3 rounded-xl bg-zinc-900 border border-zinc-700 p-4 animate-slide-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="col-span-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deadline title" className={inputCls} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as DeadlineType)} className={inputCls}>
          {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{DEADLINE_TYPE_LABELS[t]}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Grade weight %" type="number" min={0} max={100} className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-md text-xs font-medium transition-colors">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add deadline
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function SyllabusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    completed: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Extracted' },
    processing: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Processing' },
    failed: { cls: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Failed' },
    pending: { cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Pending' },
  }
  const { cls, label } = map[status] ?? map.pending
  return <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{label}</span>
}
