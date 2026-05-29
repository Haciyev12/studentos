'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { GraduationCap, Loader2, Plus, X } from 'lucide-react'
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

export default function CoursesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: COURSE_COLORS[0], credits: 3 },
  })

  const selectedColor = watch('color')

  async function fetchCourses() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
    setCourses(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  async function onSubmit(data: FormData) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('courses').insert({
      ...data,
      user_id: user!.id,
      code: data.code || null,
      professor: data.professor || null,
      semester: data.semester || null,
    })
    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Course added')
    reset({ color: COURSE_COLORS[0], credits: 3 })
    setShowForm(false)
    fetchCourses()
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your courses and syllabi</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add course
        </button>
      </div>

      {/* Add course form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-zinc-900 border border-zinc-800 p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New course</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Course name <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('name')}
                  placeholder="Introduction to Computer Science"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Course code
                </label>
                <input
                  {...register('code')}
                  placeholder="CS 101"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Professor</label>
                <input
                  {...register('professor')}
                  placeholder="Dr. Smith"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Credits</label>
                <input
                  {...register('credits')}
                  type="number"
                  min={1}
                  max={12}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Semester</label>
                <input
                  {...register('semester')}
                  placeholder="Fall 2025"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Color</label>
              <div className="flex gap-2">
                {COURSE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110 ring-offset-zinc-900"
                    style={{
                      backgroundColor: color,
                      boxShadow: selectedColor === color ? `0 0 0 2px #09090B, 0 0 0 4px ${color}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add course
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-400">No courses yet</p>
          <p className="text-xs text-zinc-600 mt-1">Click "Add course" to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: course.color }}
              >
                {course.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{course.name}</p>
                  {course.code && (
                    <span className="text-xs text-zinc-500 shrink-0">{course.code}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {[course.professor, course.semester, `${course.credits} credits`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                View →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
