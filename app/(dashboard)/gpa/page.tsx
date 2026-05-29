'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, X, TrendingUp, BookOpen, Award, GraduationCap } from 'lucide-react'
import { Grade, GRADE_POINTS } from '@/types'

const GRADE_LETTERS = Object.keys(GRADE_POINTS)
const SEMESTERS = ['Fall', 'Spring', 'Summer']

function calcGPA(grades: Grade[]): number {
  if (!grades.length) return 0
  const totalPoints = grades.reduce((sum, g) => sum + g.grade_points * g.credits, 0)
  const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0)
  return totalCredits > 0 ? totalPoints / totalCredits : 0
}

function groupBySemester(grades: Grade[]) {
  const map = new Map<string, Grade[]>()
  for (const g of grades) {
    const key = `${g.semester} ${g.year}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(g)
  }
  return Array.from(map.entries()).sort((a, b) => {
    const [semA, yearA] = a[0].split(' ')
    const [semB, yearB] = b[0].split(' ')
    const yearDiff = Number(yearB) - Number(yearA)
    if (yearDiff !== 0) return yearDiff
    const order = ['Spring', 'Summer', 'Fall']
    return order.indexOf(semB) - order.indexOf(semA)
  })
}

function getStanding(gpa: number) {
  if (gpa >= 3.7) return { label: "Dean's List", color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
  if (gpa >= 3.0) return { label: 'Good Standing', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' }
  if (gpa >= 2.0) return { label: 'Satisfactory', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
  if (gpa > 0) return { label: 'Academic Probation', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
  return null
}

function GpaChart({ semesterData }: { semesterData: { label: string; gpa: number }[] }) {
  if (semesterData.length < 2) return null
  const reversed = [...semesterData].reverse()
  const W = 400, H = 140, PAD = 30
  const maxGpa = 4.0
  const xs = reversed.map((_, i) => PAD + (i / (reversed.length - 1)) * (W - PAD * 2))
  const ys = reversed.map((d) => H - PAD - (d.gpa / maxGpa) * (H - PAD * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 overflow-hidden">
      <h3 className="text-sm font-semibold mb-4">GPA Trend</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {[0, 1, 2, 3, 4].map((v) => {
          const y = H - PAD - (v / 4) * (H - PAD * 2)
          return (
            <g key={v}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#27272a" strokeWidth="1" />
              <text x={PAD - 4} y={y + 4} textAnchor="end" fill="#71717a" fontSize="9">{v}.0</text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {reversed.map((d, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="3.5" fill="#6366f1" />
            <text x={xs[i]} y={H - 4} textAnchor="middle" fill="#71717a" fontSize="8">
              {d.label.split(' ')[0].slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

type FormState = {
  course_name: string
  course_code: string
  credits: string
  grade_letter: string
  semester: string
  year: string
}

const emptyForm: FormState = {
  course_name: '',
  course_code: '',
  credits: '3',
  grade_letter: 'A',
  semester: 'Fall',
  year: String(new Date().getFullYear()),
}

export default function GpaPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [whatIf, setWhatIf] = useState<{ name: string; credits: string; letter: string }[]>([])
  const [showWhatIf, setShowWhatIf] = useState(false)

  useEffect(() => {
    fetch('/api/grades')
      .then((r) => r.json())
      .then((d) => { setGrades(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cumulativeGpa = calcGPA(grades)
  const totalCredits = grades.reduce((s, g) => s + g.credits, 0)
  const standing = getStanding(cumulativeGpa)
  const semesterGroups = groupBySemester(grades)
  const semesterData = semesterGroups.map(([label, gs]) => ({ label, gpa: calcGPA(gs) }))

  // What-if calculation
  const whatIfGrades = whatIf.map((w) => ({
    id: '', user_id: '', course_code: null, semester: '', year: 0, created_at: '',
    course_name: w.name,
    credits: Number(w.credits) || 3,
    grade_letter: w.letter,
    grade_points: GRADE_POINTS[w.letter] ?? 0,
  } as Grade))
  const projectedGpa = calcGPA([...grades, ...whatIfGrades])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(g: Grade) {
    setForm({
      course_name: g.course_name,
      course_code: g.course_code ?? '',
      credits: String(g.credits),
      grade_letter: g.grade_letter,
      semester: g.semester,
      year: String(g.year),
    })
    setEditingId(g.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.course_name.trim()) { toast.error('Course name is required'); return }
    setSaving(true)
    const payload = {
      course_name: form.course_name.trim(),
      course_code: form.course_code.trim() || null,
      credits: Number(form.credits),
      grade_letter: form.grade_letter,
      grade_points: GRADE_POINTS[form.grade_letter] ?? 0,
      semester: form.semester,
      year: Number(form.year),
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/grades/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const updated = await res.json()
        setGrades((prev) => prev.map((g) => g.id === editingId ? updated : g))
        toast.success('Grade updated')
      } else {
        const res = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const created = await res.json()
        setGrades((prev) => [created, ...prev])
        toast.success('Grade added')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/grades/${id}`, { method: 'DELETE' })
    setGrades((prev) => prev.filter((g) => g.id !== id))
    toast.success('Grade removed')
  }

  if (loading) return null

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GPA Tracker</h1>
          <p className="text-sm text-zinc-500 mt-1">Track your grades and academic progress</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Grade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{grades.length ? cumulativeGpa.toFixed(2) : '—'}</p>
          <p className="text-xs text-zinc-500 mt-0.5"><span className="text-zinc-400">Cumulative</span> GPA</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{totalCredits}</p>
          <p className="text-xs text-zinc-500 mt-0.5"><span className="text-zinc-400">Total</span> credits</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{grades.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5"><span className="text-zinc-400">Courses</span> recorded</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          {standing ? (
            <>
              <p className={`text-sm font-bold tracking-tight ${standing.color}`}>{standing.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Academic standing</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold tracking-tight">—</p>
              <p className="text-xs text-zinc-500 mt-0.5">Academic standing</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Chart */}
        {semesterData.length >= 2 ? (
          <GpaChart semesterData={semesterData} />
        ) : (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-400">GPA trend chart</p>
            <p className="text-xs text-zinc-600 mt-1">Add grades from 2+ semesters to see trend</p>
          </div>
        )}

        {/* What-If Simulator */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">What-If Simulator</h3>
            <button
              onClick={() => setShowWhatIf(!showWhatIf)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {showWhatIf ? 'Hide' : 'Show'}
            </button>
          </div>

          {showWhatIf ? (
            <div className="space-y-3">
              {whatIf.map((w, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Course name"
                    value={w.name}
                    onChange={(e) => setWhatIf((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 text-center"
                    placeholder="Cr"
                    value={w.credits}
                    onChange={(e) => setWhatIf((p) => p.map((x, j) => j === i ? { ...x, credits: e.target.value } : x))}
                  />
                  <select
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={w.letter}
                    onChange={(e) => setWhatIf((p) => p.map((x, j) => j === i ? { ...x, letter: e.target.value } : x))}
                  >
                    {GRADE_LETTERS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                  <button onClick={() => setWhatIf((p) => p.filter((_, j) => j !== i))}>
                    <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setWhatIf((p) => [...p, { name: '', credits: '3', letter: 'A' }])}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Add hypothetical course
              </button>
              {whatIf.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Projected GPA</p>
                  <p className="text-2xl font-bold text-indigo-400">{projectedGpa.toFixed(2)}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {projectedGpa > cumulativeGpa ? '↑ ' : projectedGpa < cumulativeGpa ? '↓ ' : ''}
                    {Math.abs(projectedGpa - cumulativeGpa).toFixed(2)} vs current
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-xs text-zinc-500">Simulate how future grades will affect your GPA</p>
              <button
                onClick={() => setShowWhatIf(true)}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open simulator →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grade list */}
      {!grades.length ? (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No grades yet</p>
          <p className="text-xs text-zinc-600 mt-1 mb-4">Add your completed courses to track your GPA</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add your first grade
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {semesterGroups.map(([semester, semGrades]) => {
            const semGpa = calcGPA(semGrades)
            return (
              <div key={semester} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{semester}</h3>
                  <span className="text-xs text-zinc-400">
                    Semester GPA: <span className="text-zinc-100 font-semibold">{semGpa.toFixed(2)}</span>
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-zinc-600 border-b border-zinc-800/60">
                      <th className="text-left px-5 py-2 font-medium">Course</th>
                      <th className="text-center px-3 py-2 font-medium">Credits</th>
                      <th className="text-center px-3 py-2 font-medium">Grade</th>
                      <th className="text-center px-3 py-2 font-medium">Points</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {semGrades.map((g) => (
                      <tr key={g.id} className="group hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm text-zinc-100">{g.course_name}</p>
                          {g.course_code && <p className="text-xs text-zinc-500">{g.course_code}</p>}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-zinc-400">{g.credits}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${g.grade_points >= 3.7 ? 'text-emerald-400' : g.grade_points >= 3.0 ? 'text-blue-400' : g.grade_points >= 2.0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {g.grade_letter}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-zinc-400">{g.grade_points.toFixed(1)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => openEdit(g)} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(g.id)} className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">{editingId ? 'Edit Grade' : 'Add Grade'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Course Name *</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Calculus II"
                  value={form.course_name}
                  onChange={(e) => setForm((p) => ({ ...p, course_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Course Code</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. MATH 202"
                  value={form.course_code}
                  onChange={(e) => setForm((p) => ({ ...p, course_code: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Credits</label>
                  <input
                    type="number"
                    min="0.5"
                    max="6"
                    step="0.5"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={form.credits}
                    onChange={(e) => setForm((p) => ({ ...p, credits: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Grade</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={form.grade_letter}
                    onChange={(e) => setForm((p) => ({ ...p, grade_letter: e.target.value }))}
                  >
                    {GRADE_LETTERS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Semester</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={form.semester}
                    onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                  >
                    {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={form.year}
                    onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
