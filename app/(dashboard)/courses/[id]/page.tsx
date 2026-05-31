'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, Bot, CalendarDays, Check, CheckCircle2,
  Edit2, FileText, Loader2, MessageSquare, Plus, Send, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Upload, Users, X,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEADLINE_TYPE_LABELS, DEADLINE_TYPE_STYLES, scoreToGrade, type Course, type Deadline, type DeadlineType, type Syllabus } from '@/types'
import { cn, formatRelativeDate } from '@/lib/utils'

const DEADLINE_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

type ChatMsg = { role: 'user' | 'assistant'; content: string }

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
  const [activeTab, setActiveTab] = useState<'deadlines' | 'chat' | 'groups' | 'predictor'>('deadlines')

  // Groups tab state
  type GroupSummary = { id: string; name: string; course_name: string | null; description: string | null; invite_code: string; member_count: number; is_member: boolean }
  const [courseGroups, setCourseGroups] = useState<GroupSummary[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function fetchAll() {
    const [{ data: c }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('syllabi').select('*').eq('course_id', id).order('created_at', { ascending: false }),
      supabase.from('deadlines').select('*').eq('course_id', id).order('due_date', { ascending: true }),
    ])
    if (!c) { router.push('/courses'); return }
    setCourse(c); setSyllabi(s ?? []); setDeadlines(d ?? []); setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  async function fetchGroups(courseName: string) {
    setLoadingGroups(true)
    const params = new URLSearchParams({ name: courseName })
    if (id) params.set('courseId', id)
    const res = await fetch(`/api/groups/by-course?${params}`)
    if (res.ok) setCourseGroups(await res.json())
    setLoadingGroups(false)
  }

  async function createGroupForCourse() {
    if (!newGroupName.trim() || !course) return
    setSavingGroup(true)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim(), course_name: course.name, description: newGroupDesc.trim() || null, course_id: id }),
    })
    if (res.ok) {
      toast.success('Group created!')
      setShowCreateGroup(false); setNewGroupName(''); setNewGroupDesc('')
      fetchGroups(course.name)
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Failed to create group')
    }
    setSavingGroup(false)
  }

  async function joinGroupFromCourse(inviteCode: string) {
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode }),
    })
    if (res.ok) { toast.success('Joined!'); if (course) fetchGroups(course.name) }
    else { const err = await res.json(); toast.error(err.error ?? 'Failed to join') }
  }

  async function handleUpload(file: File) {
    const isPDF = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
    const isDOCX = file.type.includes('wordprocessingml') || file.name.toLowerCase().endsWith('.docx')
    if (!isPDF && !isDOCX) { toast.error('Please upload a PDF or DOCX file'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('File must be under 20 MB'); return }

    setUploading(true)
    const toastId = toast.loading('Reading your syllabus…')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('course_id', id)

      const res = await fetch('/api/extract-syllabus', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Extraction failed')

      toast.success(
        `Extracted ${json.count} deadline${json.count !== 1 ? 's' : ''} — added to your calendar!`,
        { id: toastId, duration: 5000 }
      )
      fetchAll()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteSyllabus(syllabusId: string) {
    await supabase.from('syllabi').delete().eq('id', syllabusId)
    toast.success('Syllabus removed')
    fetchAll()
  }

  async function sendChat() {
    const q = chatInput.trim()
    if (!q || chatLoading) return
    const completedSyllabus = syllabi.find(s => s.status === 'completed')
    if (!completedSyllabus) { toast.error('Upload a syllabus first to use AI chat'); return }

    setChatInput('')
    const newHistory: ChatMsg[] = [...chatMessages, { role: 'user', content: q }]
    setChatMessages(newHistory)
    setChatLoading(true)

    try {
      const res = await fetch('/api/syllabus-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusId: completedSyllabus.id, question: q, history: chatMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChatMessages([...newHistory, { role: 'assistant', content: data.answer }])
    } catch (err: any) {
      toast.error(err.message ?? 'Chat failed')
      setChatMessages(newHistory)
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
      </div>
    )
  }
  if (!course) return null

  const hasSyllabus = syllabi.some(s => s.status === 'completed')
  const inputCls = "w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Back */}
      <button onClick={() => router.push('/courses')} className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-300 mb-6 group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to courses
      </button>

      {/* Course header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: course.color }}>
          {course.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">{course.name}</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">
            {[course.code, course.professor, course.semester].filter(Boolean).join(' · ')}
            {course.credits && ` · ${course.credits} credits`}
          </p>
        </div>
      </motion.div>

      {/* Upload zone */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Syllabus</h2>
        <div
          className={cn(
            'relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200',
            dragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/5 scale-[1.01]' : 'border-gray-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-900/40',
            uploading && 'pointer-events-none'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} style={{ display: 'none' }} />
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div key="uploading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">AI is reading your syllabus…</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Extracting deadlines and adding to your calendar</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </motion.div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Drop your syllabus here</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500">PDF or DOCX · max 20 MB</p>
                {hasSyllabus && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Syllabus uploaded — upload again to update
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Uploaded syllabi */}
        <AnimatePresence>
          {syllabi.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
              {syllabi.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 group shadow-sm"
                >
                  <FileText className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-gray-700 dark:text-zinc-200">{s.file_name}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">{formatRelativeDate(s.created_at)}</p>
                  </div>
                  <SyllabusBadge status={s.status} />
                  <button onClick={() => handleDeleteSyllabus(s.id)} className="ml-1 p-1.5 rounded-lg text-gray-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar link after upload */}
        {hasSyllabus && deadlines.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300 flex-1">
              {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''} added to your calendar
            </p>
            <Link href="/calendar" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 underline underline-offset-2">
              View calendar →
            </Link>
          </motion.div>
        )}
      </motion.section>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800 mb-6 w-fit">
          {[
            { key: 'deadlines', label: `Deadlines (${deadlines.length})`, icon: CalendarDays },
            { key: 'predictor', label: 'Grade Predictor', icon: TrendingUp },
            { key: 'chat', label: 'AI Chat', icon: Bot },
            { key: 'groups', label: 'Groups', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => {
              setActiveTab(key as typeof activeTab)
              if (key === 'groups' && course) fetchGroups(course.name)
            }}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === key ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300')}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'deadlines' ? (
            <motion.div key="deadlines" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Deadlines</h2>
                <button onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-300">
                  <Plus className="w-3.5 h-3.5" /> Add manually
                </button>
              </div>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <AddDeadlineForm courseId={id} inputCls={inputCls} onSave={() => { setShowAddForm(false); fetchAll() }} onCancel={() => setShowAddForm(false)} />
                  </motion.div>
                )}
              </AnimatePresence>

              {deadlines.length === 0 && !showAddForm ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center py-14 text-center shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">No deadlines yet</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Upload a syllabus above to extract them automatically</p>
                </motion.div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider px-4 py-3 border-b border-gray-100 dark:border-zinc-800 gap-3">
                    <span>Title</span>
                    <span className="w-20 text-center">Type</span>
                    <span className="w-24 text-right">Due date</span>
                    <span className="w-16 text-right">Weight</span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                    <AnimatePresence>
                      {deadlines.map((deadline, i) =>
                        editingId === deadline.id ? (
                          <EditDeadlineRow key={deadline.id} deadline={deadline} inputCls={inputCls} onSave={() => { setEditingId(null); fetchAll() }} onCancel={() => setEditingId(null)} />
                        ) : (
                          <motion.div key={deadline.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <DeadlineRow deadline={deadline} onEdit={() => setEditingId(deadline.id)} onDelete={async () => { await supabase.from('deadlines').delete().eq('id', deadline.id); fetchAll() }} onToggle={async () => { await supabase.from('deadlines').update({ completed: !deadline.completed }).eq('id', deadline.id); fetchAll() }} />
                          </motion.div>
                        )
                      )}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'predictor' ? (
            <motion.div key="predictor" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <GradePredictor deadlines={deadlines} course={course} onRefresh={fetchAll} />
            </motion.div>
          ) : activeTab === 'groups' ? (
            <motion.div key="groups" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                  Study Groups for {course.name}
                </h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => fetchGroups(course.name)} disabled={loadingGroups}
                    className="text-xs text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-300 disabled:opacity-50">
                    {loadingGroups ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '↻ Refresh'}
                  </button>
                  <button onClick={() => { setShowCreateGroup(true); setNewGroupName(`${course.name} Study Group`) }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    <Plus className="w-3.5 h-3.5" /> Create group
                  </button>
                </div>
              </div>

              {showCreateGroup && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-3">New study group</p>
                  <div className="space-y-2">
                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name"
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500" />
                    <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description (optional)"
                      className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={createGroupForCourse} disabled={savingGroup || !newGroupName.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg text-xs font-medium text-white">
                      {savingGroup ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create
                    </button>
                    <button onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setNewGroupDesc('') }}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {loadingGroups ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-zinc-800 animate-pulse" />)}
                </div>
              ) : courseGroups.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-800 p-10 text-center shadow-sm">
                  <Users className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">No groups found for "{course.name}"</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">If your group exists, make sure its name or course name contains "{course.name}"</p>
                  <Link href="/groups" className="mt-3 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Browse all groups →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {courseGroups.map((g, i) => (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{g.name}</p>
                        {g.description && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">{g.description}</p>}
                        <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</p>
                      </div>
                      {g.is_member ? (
                        <Link href={`/groups/${g.id}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                          Open →
                        </Link>
                      ) : (
                        <button onClick={() => joinGroupFromCourse(g.invite_code)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white">
                          Join
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              {!hasSyllabus ? (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center py-14 text-center shadow-sm">
                  <MessageSquare className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Upload a syllabus first</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Then ask the AI anything about this course</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col" style={{ height: '520px' }}>
                  {/* Chat header */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Syllabus Assistant</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Ask anything about this course</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-400 dark:text-zinc-500 mb-4">Suggested questions:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {['What are the exam dates?', 'How is the final grade calculated?', 'Who is the professor?', 'What topics are covered?'].map(q => (
                            <button key={q} onClick={() => { setChatInput(q) }} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <AnimatePresence>
                      {chatMessages.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                          {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                          )}
                          <div className={cn('max-w-[80%] px-4 py-2.5 rounded-2xl text-sm', msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-bl-md')}>
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {chatLoading && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                          {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                      placeholder="Ask about this course…"
                      className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white shadow-sm shadow-indigo-500/20">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function DeadlineRow({ deadline, onEdit, onDelete, onToggle }: { deadline: Deadline; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const isPast = new Date(deadline.due_date + 'T00:00:00') < new Date()
  return (
    <li className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onToggle} className={cn('shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center', deadline.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-zinc-600 hover:border-indigo-400')}>
          {deadline.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="min-w-0">
          <p className={cn('text-sm truncate', deadline.completed ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-zinc-100')}>{deadline.title}</p>
          {deadline.description && <p className="text-xs text-gray-400 dark:text-zinc-600 truncate mt-0.5">{deadline.description}</p>}
        </div>
      </div>
      <div className="w-20 flex justify-center">
        <span className={cn('text-xs px-2 py-0.5 rounded-md', DEADLINE_TYPE_STYLES[deadline.type])}>{DEADLINE_TYPE_LABELS[deadline.type]}</span>
      </div>
      <div className="w-24 text-right">
        <span className={cn('text-xs', isPast && !deadline.completed ? 'text-red-500' : 'text-gray-400 dark:text-zinc-400')}>
          {format(new Date(deadline.due_date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
      </div>
      <div className="w-16 flex items-center justify-end gap-1">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{deadline.weight != null ? `${deadline.weight}%` : '—'}</span>
        <div className="hidden group-hover:flex items-center gap-1 ml-1">
          <button onClick={onEdit} className="p-1 text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-300"><Edit2 className="w-3 h-3" /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 dark:text-zinc-600 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </li>
  )
}

function EditDeadlineRow({ deadline, onSave, onCancel, inputCls }: { deadline: Deadline; onSave: () => void; onCancel: () => void; inputCls: string }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(deadline.title)
  const [type, setType] = useState<DeadlineType>(deadline.type)
  const [dueDate, setDueDate] = useState(deadline.due_date)
  const [weight, setWeight] = useState(deadline.weight?.toString() ?? '')

  async function save() {
    if (!title || !dueDate) return
    setSaving(true)
    await supabase.from('deadlines').update({ title, type, due_date: dueDate, weight: weight ? parseFloat(weight) : null, manually_edited: true }).eq('id', deadline.id)
    setSaving(false); onSave()
  }

  return (
    <li className="px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-700/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div className="col-span-2"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className={inputCls} /></div>
        <select value={type} onChange={e => setType(e.target.value as DeadlineType)} className={inputCls}>
          {DEADLINE_TYPES.map(t => <option key={t} value={t}>{DEADLINE_TYPE_LABELS[t]}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
        <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight %" type="number" min={0} max={100} className={inputCls} />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg text-xs font-medium text-white">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700">Cancel</button>
      </div>
    </li>
  )
}

function AddDeadlineForm({ courseId, onSave, onCancel, inputCls }: { courseId: string; onSave: () => void; onCancel: () => void; inputCls: string }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(''); const [type, setType] = useState<DeadlineType>('assignment')
  const [dueDate, setDueDate] = useState(''); const [weight, setWeight] = useState('')

  async function save() {
    if (!title || !dueDate) { toast.error('Title and due date are required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('deadlines').insert({ course_id: courseId, user_id: user!.id, title, type, due_date: dueDate, weight: weight ? parseFloat(weight) : null, manually_edited: true })
    setSaving(false); onSave()
  }

  return (
    <div className="mb-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 p-4 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="col-span-2"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deadline title" className={inputCls} /></div>
        <select value={type} onChange={e => setType(e.target.value as DeadlineType)} className={inputCls}>
          {DEADLINE_TYPES.map(t => <option key={t} value={t}>{DEADLINE_TYPE_LABELS[t]}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
        <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="Grade weight %" type="number" min={0} max={100} className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-xs font-medium text-white">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add deadline
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-xl text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800">Cancel</button>
      </div>
    </div>
  )
}

function SyllabusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    completed: { cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', label: 'Extracted' },
    processing: { cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', label: 'Processing' },
    failed: { cls: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20', label: 'Failed' },
    pending: { cls: 'bg-gray-100 dark:bg-zinc-500/10 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-500/20', label: 'Pending' },
  }
  const { cls, label } = map[status] ?? map.pending
  return <span className={`text-xs px-2 py-0.5 rounded-lg border ${cls} shrink-0`}>{label}</span>
}

// ─── Grade Predictor ──────────────────────────────────────────────────────────

const TARGET_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'] as const
const TARGET_MINIMUMS: Record<string, number> = {
  A: 94, 'A-': 90, 'B+': 87, B: 83, 'B-': 80,
  'C+': 77, C: 73, 'C-': 70, 'D+': 67, D: 60,
}
function gradeColor(letter: string): string {
  if (letter.startsWith('A')) return 'text-emerald-500 dark:text-emerald-400'
  if (letter.startsWith('B')) return 'text-blue-500 dark:text-blue-400'
  if (letter.startsWith('C')) return 'text-amber-500 dark:text-amber-400'
  if (letter.startsWith('D')) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function GradePredictor({ deadlines, course, onRefresh }: { deadlines: Deadline[]; course: Course; onRefresh: () => void }) {
  const [scores, setScores] = useState<Record<string, string>>({})
  const [targetGrade, setTargetGrade] = useState('B+')
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const d of deadlines) {
      if (d.score != null) initial[d.id] = d.score.toString()
    }
    setScores(initial)
  }, [deadlines])

  const weightedItems = deadlines.filter(d => d.weight != null && d.weight > 0)
  const totalWeight = weightedItems.reduce((sum, d) => sum + (d.weight ?? 0), 0)
  const scoredItems = weightedItems.filter(d => (scores[d.id] ?? '') !== '')
  const scoredWeightedSum = scoredItems.reduce((sum, d) => {
    const s = parseFloat(scores[d.id])
    return sum + (isNaN(s) ? 0 : s * (d.weight ?? 0))
  }, 0)
  const scoredWeight = scoredItems.reduce((sum, d) => sum + (d.weight ?? 0), 0)
  const remainingWeight = totalWeight - scoredWeight
  const currentScore = scoredWeight > 0 ? scoredWeightedSum / scoredWeight : null
  const currentLetter = currentScore != null ? scoreToGrade(currentScore) : null

  function neededScore() {
    if (remainingWeight === 0) return null
    return (TARGET_MINIMUMS[targetGrade] * totalWeight - scoredWeightedSum) / remainingWeight
  }

  function handleScoreChange(deadlineId: string, value: string) {
    const num = parseFloat(value)
    const clamped = value === '' ? '' : isNaN(num) ? '' : String(Math.min(100, Math.max(0, num)))
    setScores(prev => ({ ...prev, [deadlineId]: clamped }))
    if (debounceRef.current[deadlineId]) clearTimeout(debounceRef.current[deadlineId])
    debounceRef.current[deadlineId] = setTimeout(() => {
      fetch(`/api/deadlines/${deadlineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: clamped === '' ? null : parseFloat(clamped) }),
      }).then(() => onRefresh())
    }, 800)
  }

  const needed = neededScore()
  const isAlreadyAchieved = needed != null && needed <= 0
  const isAchievable = needed != null && needed <= 100

  return (
    <div className="space-y-5">
      {/* Assessment Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Assessment Scores</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Enter your scores to predict your final grade</p>
          </div>
          {totalWeight > 0 && (
            <span className="text-xs text-gray-400 dark:text-zinc-500">{totalWeight}% of grade tracked</span>
          )}
        </div>

        {weightedItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Target className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-zinc-500">No weighted assessments yet</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Upload a syllabus or add deadlines with grade weights to use the predictor</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider px-5 py-3 border-b border-gray-100 dark:border-zinc-800 gap-3">
              <span>Assessment</span>
              <span className="w-20 text-center">Type</span>
              <span className="w-14 text-right">Weight</span>
              <span className="w-24 text-center">Score</span>
              <span className="w-20 text-right">Contribution</span>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800/60">
              {weightedItems.map((d, i) => {
                const scoreStr = scores[d.id] ?? ''
                const scoreNum = scoreStr === '' ? null : parseFloat(scoreStr)
                const contribution = scoreNum != null && !isNaN(scoreNum) && d.weight != null
                  ? (scoreNum * d.weight / 100).toFixed(1)
                  : null
                return (
                  <motion.li key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-zinc-100 truncate">{d.title}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
                        {format(new Date(d.due_date + 'T00:00:00'), 'MMM d')}
                      </p>
                    </div>
                    <div className="w-20 flex justify-center">
                      <span className={cn('text-xs px-2 py-0.5 rounded-md', DEADLINE_TYPE_STYLES[d.type])}>
                        {DEADLINE_TYPE_LABELS[d.type]}
                      </span>
                    </div>
                    <div className="w-14 text-right">
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">{d.weight}%</span>
                    </div>
                    <div className="w-24 flex justify-center">
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={scoreStr}
                        onChange={e => handleScoreChange(d.id, e.target.value)}
                        placeholder="—"
                        className={cn(
                          'w-20 text-center bg-gray-50 dark:bg-zinc-800 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors',
                          scoreStr !== ''
                            ? 'border-indigo-200 dark:border-indigo-500/30 text-gray-900 dark:text-zinc-100'
                            : 'border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500'
                        )}
                      />
                    </div>
                    <div className="w-20 text-right">
                      {contribution != null
                        ? <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">+{contribution}</span>
                        : <span className="text-sm text-gray-300 dark:text-zinc-700">—</span>}
                    </div>
                  </motion.li>
                )
              })}
            </ul>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800">
              <span className="text-xs text-gray-400 dark:text-zinc-500">{scoredItems.length}/{weightedItems.length} scored</span>
              <span className="w-20" />
              <span className="w-14 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">{totalWeight}%</span>
              <div className="w-24 text-center">
                {currentScore != null
                  ? <span className={cn('text-sm font-bold', gradeColor(currentLetter ?? 'F'))}>{currentScore.toFixed(1)}</span>
                  : <span className="text-xs text-gray-300 dark:text-zinc-700">—</span>}
              </div>
              <div className="w-20 text-right">
                {scoredWeightedSum > 0
                  ? <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{(scoredWeightedSum / 100).toFixed(1)}</span>
                  : <span className="text-xs text-gray-300 dark:text-zinc-700">—</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {weightedItems.length > 0 && (
        <>
          {/* Summary + Target Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Grade Card */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Current Grade</p>
              {currentScore != null ? (
                <>
                  <div className="flex items-end gap-3">
                    <span className={cn('text-4xl font-bold', gradeColor(currentLetter ?? 'F'))}>
                      {currentLetter}
                    </span>
                    <div className="mb-0.5">
                      <span className="text-xl font-semibold text-gray-700 dark:text-zinc-200">{currentScore.toFixed(1)}%</span>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">based on {scoredWeight}% of grade</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentScore}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', currentScore >= 90 ? 'bg-emerald-500' : currentScore >= 80 ? 'bg-blue-500' : currentScore >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <span className="text-3xl font-bold text-gray-200 dark:text-zinc-700">—</span>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">Enter scores to see your grade</p>
                </div>
              )}
            </div>

            {/* Target Grade Calculator */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">Target Grade</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-500 dark:text-zinc-400">I want</span>
                <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)}
                  className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500">
                  {TARGET_GRADES.map(g => <option key={g} value={g}>{g} (≥{TARGET_MINIMUMS[g]}%)</option>)}
                </select>
              </div>
              <AnimatePresence mode="wait">
                {needed == null ? (
                  <motion.p key="no-data" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-gray-400 dark:text-zinc-500">
                    {remainingWeight === 0 ? 'All items scored!' : 'Enter some scores first'}
                  </motion.p>
                ) : isAlreadyAchieved ? (
                  <motion.div key="achieved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Already achieved <strong>{targetGrade}</strong>!</p>
                  </motion.div>
                ) : isAchievable ? (
                  <motion.div key="achievable" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Need <strong>{needed.toFixed(1)}%</strong> on remaining {remainingWeight}%
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">to reach <strong>{targetGrade}</strong></p>
                  </motion.div>
                ) : (
                  <motion.div key="not-achievable" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10">
                    <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>{targetGrade}</strong> not achievable (needs {needed.toFixed(0)}%)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
