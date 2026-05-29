import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const createSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  type: z.enum(['assignment', 'quiz', 'exam', 'project', 'other']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
})

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (set: { name: string; value: string; options: CookieOptions }[]) => {
          try { set.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('course_id')

  let query = supabase
    .from('deadlines')
    .select('*, course:courses(name, color, code)')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  if (courseId) query = query.eq('course_id', courseId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = createSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('deadlines')
    .insert({ ...result.data, user_id: user.id, manually_edited: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
