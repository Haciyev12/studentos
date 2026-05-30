'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, X, TrendingUp, BookOpen, Award, GraduationCap } from 'lucide-react'
import { Grade, GRADE_POINTS, GRADE_RANGES, scoreToGrade } from '@/types'

const GRADE_LETTERS = Object.keys(GRADE_POINTS)
const SEMESTERS = ['Fall', 'Spring', 'Summer']

function calcGPA(grades: Grade[]): number {
  if (!grades.length) return 0
  const tp = grades.reduce((s, g) => s + g.grade_points * g.credits, 0)
  const tc = grades.reduce((s, g) => s + g.credits, 0)
  return tc > 0 ? Math.round((tp / tc) * 100) / 100 : 0
}

function groupBySemester(grades: Grade[]) {
  const map = new Map<string, Grade[]>()
  for (const g of grades) {
    const key = `${g.semester} ${g.year}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(g)
  }
  return Array.from(map.entries()).sort((a, b) => {
    const [, yearA] = a[0].split(' ')
    const [, yearB] = b[0].split(' ')
    const yd = Number(yearB) - Number(yearA)
    if (yd !== 0) return yd
    const order = ['Spring', 'Summer', 'Fall']
    return order.indexOf(b[0].split(' ')[0]) - order.indexOf(a[0].split(' ')[0])
  })
}

function getStanding(gpa: number) {
  if (gpa >= 3.67) return { label: "Dean's List", color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' }
  if (gpa >= 3.00) return { label: 'Good Standing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' }
  if (gpa >= 2.00) return { label: 'Satisfactory', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' }
  if (gpa > 0)     return { label: 'Academic Probation', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' }
  return null
}

function gradeColor(points: number) {
  if (points >= 3.67) return 'text-emerald-600 dark:text-emerald-400'
  if (points >= 3.00) return 'text-blue-600 dark:text-blue-400'
  if (points >= 2.00) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function GpaChart({ semesterData }: { semesterData: { label: string; gpa: number }[] }) {
  if (semesterData.length < 2) return null
  const [hovered, setHovered] = useState<number | null>(null)
  const reversed = [...semesterData].reverse()
  const W = 400, H = 140, PX = 36, PY = 20
  const ys = reversed.map((d) => H - PY - (d.gpa / 4.0) * (H - PY * 2))
  const xs = reversed.map((_, i) => PX + (i / (reversed.length - 1)) * (W - PX * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')
  const area = `${path} L ${xs[xs.length-1].toFixed(1)} ${H} L ${xs[0].toFixed(1)} ${H} Z`

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4">GPA Trend</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="gpa-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((v) => {
          const y = H - PY - (v / 4) * (H - PY * 2)
          return (
            <g key={v}>
              <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-gray-900 dark:text-white" />
              <text x={PX - 4} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity="0.4" fontSize="9" className="text-gray-900 dark:text-white">{v}.0</text>
            </g>
          )
        })}
        {/* Area fill */}
        <motion.path d={area} fill="url(#gpa-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7 }} />
        {/* Line draws itself */}
        <motion.path
          d={path}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.1 }}
        />
        {/* Data points bounce in after line */}
        {reversed.map((d, i) => (
          <g key={i}>
            {/* Hover target (invisible, larger) */}
            <circle cx={xs[i]} cy={ys[i]} r="14" fill="transparent"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }} />
            <motion.circle cx={xs[i]} cy={ys[i]} r="7" fill="#6366f1" fillOpacity="0.15"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.9 + i * 0.07, type: 'spring', stiffness: 400, damping: 15 }} />
            <motion.circle cx={xs[i]} cy={ys[i]} r="4" fill="#6366f1"
              initial={{ scale: 0 }} animate={{ scale: hovered === i ? 1.4 : 1 }}
              transition={{ delay: hovered === i ? 0 : 0.9 + i * 0.07, type: 'spring', stiffness: 400, damping: 15 }} />
            <text x={xs[i]} y={H - 4} textAnchor="middle" fill="currentColor" fillOpacity="0.5" fontSize="8" className="text-gray-900 dark:text-white">
              {d.label.split(' ')[0].slice(0, 3)} {d.label.split(' ')[1]?.slice(2)}
            </text>
            {/* Tooltip that slides up on hover */}
            <AnimatedTooltip show={hovered === i} x={xs[i]} y={ys[i]} label={d.label} gpa={d.gpa} />
          </g>
        ))}
      </svg>
    </div>
  )
}

function AnimatedTooltip({ show, x, y, label, gpa }: { show: boolean; x: number; y: number; label: string; gpa: number }) {
  if (!show) return null
  const tooltipY = y - 32
  const clampedX = Math.max(40, Math.min(360, x))
  return (
    <g>
      <rect x={clampedX - 28} y={tooltipY - 14} width="56" height="22" rx="4" fill="#1e1b4b" opacity="0.9" />
      <text x={clampedX} y={tooltipY - 1} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{gpa.toFixed(2)}</text>
      <text x={clampedX} y={tooltipY + 9} textAnchor="middle" fill="white" fontSize="7" opacity="0.7">{label}</text>
    </g>
  )
}

type FormState = { course_name: string; course_code: string; credits: string; score: string; grade_letter: string; useScore: boolean; semester: string; year: string }
const emptyForm: FormState = { course_name: '', course_code: '', credits: '3', score: '', grade_letter: 'A', useScore: true, semester: 'Fall', year: String(new Date().getFullYear()) }

export default function GpaPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [whatIf, setWhatIf] = useState<{ name: string; credits: string; score: string; letter: string; useScore: boolean }[]>([])
  const [showWhatIf, setShowWhatIf] = useState(false)

  useEffect(() => {
    fetch('/api/grades').then(r => r.json()).then(d => { setGrades(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const cumulativeGpa = calcGPA(grades)
  const totalCredits = grades.reduce((s, g) => s + g.credits, 0)
  const standing = getStanding(cumulativeGpa)
  const semesterGroups = groupBySemester(grades)
  const semesterData = semesterGroups.map(([label, gs]) => ({ label, gpa: calcGPA(gs) }))

  const whatIfGrades: Grade[] = whatIf.map(w => {
    const letter = w.useScore && w.score ? scoreToGrade(Number(w.score)) : w.letter
    return { id: '', user_id: '', course_code: null, semester: '', year: 0, created_at: '', course_name: w.name, credits: Number(w.credits) || 3, grade_letter: letter, grade_points: GRADE_POINTS[letter] ?? 0 }
  })
  const projectedGpa = calcGPA([...grades, ...whatIfGrades])

  const derivedLetter = form.useScore && form.score ? scoreToGrade(Number(form.score)) : form.grade_letter
  const derivedPoints = GRADE_POINTS[derivedLetter] ?? 0

  function openAdd() { setForm(emptyForm); setEditingId(null); setShowModal(true) }
  function openEdit(g: Grade) {
    setForm({ course_name: g.course_name, course_code: g.course_code ?? '', credits: String(g.credits), score: '', grade_letter: g.grade_letter, useScore: false, semester: g.semester, year: String(g.year) })
    setEditingId(g.id); setShowModal(true)
  }

  async function handleSave() {
    if (!form.course_name.trim()) { toast.error('Course name is required'); return }
    setSaving(true)
    const payload = { course_name: form.course_name.trim(), course_code: form.course_code.trim() || null, credits: Number(form.credits), grade_letter: derivedLetter, grade_points: derivedPoints, semester: form.semester, year: Number(form.year) }
    try {
      if (editingId) {
        const res = await fetch(`/api/grades/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        setGrades(prev => prev.map(g => g.id === editingId ? { ...g, ...payload } : g))
        toast.success('Grade updated')
      } else {
        const res = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const created = await res.json()
        setGrades(prev => [created, ...prev])
        toast.success('Grade added')
      }
      setShowModal(false)
    } catch { toast.error('Failed to save grade') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/grades/${id}`, { method: 'DELETE' })
    setGrades(prev => prev.filter(g => g.id !== id))
    toast.success('Grade removed')
  }

  if (loading) return null

  const inputClass = "w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
  const selectClass = "w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
  const cardClass = "rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm"

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">GPA Tracker</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">ADA University official grading scale</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white shadow-sm shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Add Grade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: TrendingUp, label: 'Cumulative GPA', value: grades.length ? cumulativeGpa.toFixed(2) : '—', color: 'indigo' },
          { icon: BookOpen, label: 'Total Credits', value: String(totalCredits), color: 'violet' },
          { icon: GraduationCap, label: 'Courses', value: String(grades.length), color: 'blue' },
          { icon: Award, label: 'Standing', value: standing?.label ?? '—', color: 'emerald', small: true },
        ].map(({ icon: Icon, label, value, color, small }) => {
          const colors: Record<string, string> = {
            indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
            blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
            emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          }
          return (
            <div key={label} className={`${cardClass} p-4`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={`font-bold tracking-tight text-gray-900 dark:text-zinc-100 ${small ? 'text-sm leading-tight' : 'text-xl'}`}>{value}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {semesterData.length >= 2 ? <GpaChart semesterData={semesterData} /> : (
          <div className={`${cardClass} p-5 flex flex-col items-center justify-center text-center`}>
            <TrendingUp className="w-8 h-8 text-gray-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm text-gray-500 dark:text-zinc-400">GPA Trend Chart</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Add grades from 2+ semesters</p>
          </div>
        )}

        {/* What-If Simulator */}
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">What-If Simulator</h3>
            <button onClick={() => setShowWhatIf(!showWhatIf)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              {showWhatIf ? 'Hide' : 'Show'}
            </button>
          </div>
          {showWhatIf ? (
            <div className="space-y-3">
              {whatIf.map((w, i) => {
                const wLetter = w.useScore && w.score ? scoreToGrade(Number(w.score)) : w.letter
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500" placeholder="Course name" value={w.name} onChange={e => setWhatIf(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input className="w-12 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 text-center" placeholder="Cr" value={w.credits} onChange={e => setWhatIf(p => p.map((x, j) => j === i ? { ...x, credits: e.target.value } : x))} />
                    <input className="w-14 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 text-center" placeholder="Score" value={w.score} onChange={e => setWhatIf(p => p.map((x, j) => j === i ? { ...x, score: e.target.value, useScore: true } : x))} />
                    <span className={`text-xs font-bold w-8 text-center ${gradeColor(GRADE_POINTS[wLetter] ?? 0)}`}>{wLetter}</span>
                    <button onClick={() => setWhatIf(p => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400" /></button>
                  </div>
                )
              })}
              <button onClick={() => setWhatIf(p => [...p, { name: '', credits: '3', score: '', letter: 'A', useScore: true }])} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                + Add hypothetical course
              </button>
              {whatIf.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Projected GPA</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{projectedGpa.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
                    {projectedGpa > cumulativeGpa ? '↑ ' : projectedGpa < cumulativeGpa ? '↓ ' : '= '}
                    {Math.abs(projectedGpa - cumulativeGpa).toFixed(2)} vs current
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-xs text-gray-400 dark:text-zinc-500">Simulate how future grades affect your GPA</p>
              <button onClick={() => setShowWhatIf(true)} className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Open simulator →</button>
            </div>
          )}
        </div>
      </div>

      {/* Grade scale reference */}
      <div className={`${cardClass} p-5 mb-8`}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">ADA University Grade Scale</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {GRADE_RANGES.map(r => (
            <div key={r.letter} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
              <p className={`text-sm font-bold ${gradeColor(GRADE_POINTS[r.letter] ?? 0)}`}>{r.letter}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{GRADE_POINTS[r.letter]?.toFixed(2)}</p>
              <p className="text-[10px] text-gray-300 dark:text-zinc-600">{r.min}–{r.max}</p>
            </div>
          ))}
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
            <p className="text-sm font-bold text-red-600 dark:text-red-400">FX</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500">0.00</p>
            <p className="text-[10px] text-gray-300 dark:text-zinc-600">0</p>
          </div>
        </div>
      </div>

      {/* Grade list */}
      {!grades.length ? (
        <div className={`${cardClass} flex flex-col items-center justify-center py-16 text-center`}>
          <GraduationCap className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">No grades yet</p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1 mb-4">Add your completed courses to track your GPA</p>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white">
            <Plus className="w-4 h-4" /> Add your first grade
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {semesterGroups.map(([semester, semGrades]) => (
            <div key={semester} className={`${cardClass} overflow-hidden`}>
              <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{semester}</h3>
                <span className="text-xs text-gray-400 dark:text-zinc-400">
                  Semester GPA: <span className="font-semibold text-gray-900 dark:text-zinc-100">{calcGPA(semGrades).toFixed(2)}</span>
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-800/60">
                    <th className="text-left px-5 py-2 font-medium">Course</th>
                    <th className="text-center px-3 py-2 font-medium">Credits</th>
                    <th className="text-center px-3 py-2 font-medium">Grade</th>
                    <th className="text-center px-3 py-2 font-medium">Points</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/40">
                  {semGrades.map(g => (
                    <tr key={g.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-900 dark:text-zinc-100">{g.course_name}</p>
                        {g.course_code && <p className="text-xs text-gray-400 dark:text-zinc-500">{g.course_code}</p>}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-500 dark:text-zinc-400">{g.credits}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-sm font-bold ${gradeColor(g.grade_points)}`}>{g.grade_letter}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-500 dark:text-zinc-400">{g.grade_points.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 justify-end">
                          <button onClick={() => openEdit(g)} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(g.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{editingId ? 'Edit Grade' : 'Add Grade'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Course Name *</label>
                <input className={inputClass} placeholder="e.g. Calculus II" value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Course Code</label>
                <input className={inputClass} placeholder="e.g. MATH 202" value={form.course_code} onChange={e => setForm(p => ({ ...p, course_code: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Credits</label>
                  <input type="number" min="0.5" max="6" step="0.5" className={inputClass} value={form.credits} onChange={e => setForm(p => ({ ...p, credits: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">
                    {form.useScore ? 'Score (0–100)' : 'Grade Letter'}
                  </label>
                  <div className="flex gap-2">
                    {form.useScore ? (
                      <input type="number" min="0" max="100" className={inputClass} placeholder="e.g. 87" value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))} />
                    ) : (
                      <select className={selectClass} value={form.grade_letter} onChange={e => setForm(p => ({ ...p, grade_letter: e.target.value }))}>
                        {GRADE_LETTERS.map(l => <option key={l}>{l}</option>)}
                      </select>
                    )}
                  </div>
                  <button type="button" onClick={() => setForm(p => ({ ...p, useScore: !p.useScore }))} className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    Switch to {form.useScore ? 'letter' : 'score'}
                  </button>
                </div>
              </div>
              {form.useScore && form.score && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                  <span className="text-xs text-gray-500 dark:text-zinc-400">Score {form.score} →</span>
                  <span className={`text-sm font-bold ${gradeColor(derivedPoints)}`}>{derivedLetter}</span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">({derivedPoints.toFixed(2)} points)</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Semester</label>
                  <select className={selectClass} value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Year</label>
                  <input type="number" min="2000" max="2100" className={inputClass} value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-700 dark:hover:text-zinc-200">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white shadow-sm shadow-indigo-500/20">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
