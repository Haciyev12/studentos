import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, creator_name, is_active, created_at')
    .eq('group_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quizzes: data })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, questions } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!questions?.length) return NextResponse.json({ error: 'At least one question required' }, { status: 400 })

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const creatorName = member?.display_name ?? user.email?.split('@')[0] ?? 'Student'

  const { data: quiz, error: qError } = await supabase
    .from('quizzes')
    .insert({ group_id: params.id, created_by: user.id, creator_name: creatorName, title: title.trim(), description: description?.trim() })
    .select()
    .single()

  if (qError || !quiz) return NextResponse.json({ error: qError?.message }, { status: 500 })

  const rows = questions.map((q: { question: string; options: string[]; correct_index: number; image_url?: string | null }, i: number) => ({
    quiz_id: quiz.id,
    question: q.question,
    options: q.options,
    correct_index: q.correct_index,
    order_index: i,
    image_url: q.image_url || null,
  }))

  await supabase.from('quiz_questions').insert(rows)
  return NextResponse.json({ quiz })
}
