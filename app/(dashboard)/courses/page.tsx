'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { GraduationCap, Loader2, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types'
import { COURSE_COLORS } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Course name is required'),
  code: z.string().optional(),
  professor: z.string().optional(),
  credits: z.coerce.number().min(1).max(12).default(3),
  semester: z.string().optional(),
  color: z.string().default(COURSE_COLORS[0]),
})
type FormData = z.infer<typeof schema>

const inputClass = "w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"

export default function CoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: COURSE_COLORS[0], credits: 3 },
  })
  const selectedColor = watch('color')

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    setCourses(data ?? []); setLoading(false)
  }

  async function deleteCourse(courseId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this course and all its deadlines?')) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('deadlines').delete().eq('course_id', courseId)
    await supabase.from('syllabi').delete().eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId).eq('user_id', user!.id)
    toast.success('Course deleted')
    fetchCourses()
  }

  useEffect(() => { fetchCourses() }, [])

  async function onSubmit(data: FormData) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('courses').insert({ ...data, user_id: user!.id, code: data.code || null, professor: data.professor || null, semester: data.semester || null })
    setSaving(false)
    if (error) { toast.error(error.message); return }

    // Check if this course already exists in GPA tracker (case-insensitive)
    const { data: existingGrades } = await supabase
      .from('grades')
      .select('id')
      .eq('user_id', user!.id)
      .ilike('course_name', data.name)
      .limit(1)

    if (!existingGrades?.length) {
      // Parse semester + year from the semester field (e.g. "Fall 2025")
      const parts = (data.semester ?? '').split(' ')
      const semLabel = parts[0] || 'Fall'
      const semYear = parseInt(parts[1]) || new Date().getFullYear()
      const validSems = ['Fall', 'Spring', 'Summer']
      const sem = validSems.includes(semLabel) ? semLabel : 'Fall'

      await supabase.from('grades').insert({
        user_id: user!.id,
        course_name: data.name,
        course_code: data.code || null,
        credits: data.credits,
        grade_letter: 'IP',
        grade_points: 0,
        semester: sem,
        year: semYear,
        in_progress: true,
      })
      toast.success('Course added · Added to GPA tracker as "Not graded yet"')
    } else {
      toast.success('Course added')
    }

    reset({ color: COURSE_COLORS[0], credits: 3 })
    setShowForm(false); fetchCourses()
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">Courses</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">Manage your courses and syllabi</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white shadow-sm shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Add course
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">New course</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Course name <span className="text-red-500">*</span></label>
                <input {...register('name')} placeholder="Introduction to Computer Science" className={inputClass} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Course code</label>
                <input {...register('code')} placeholder="CS 101" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Professor</label>
                <input {...register('professor')} placeholder="Dr. Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Credits</label>
                <input {...register('credits')} type="number" min={1} max={12} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Semester</label>
                <input {...register('semester')} placeholder="Fall 2025" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">Color</label>
              <div className="flex gap-2">
                {COURSE_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setValue('color', color)}
                    className="w-6 h-6 rounded-full hover:scale-110 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                    style={{ backgroundColor: color, boxShadow: selectedColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" data-no-transition />}
                Add course
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" data-no-transition />
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">No courses yet</p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Click "Add course" to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {courses.map(course => (
            <Link key={course.id} href={`/courses/${course.id}`}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: course.color }}>
                {course.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">{course.name}</p>
                  {course.code && <span className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">{course.code}</span>}
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                  {[course.professor, course.semester, `${course.credits} credits`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-zinc-400">View →</span>
                <button
                  onClick={e => deleteCourse(course.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
