import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string; quizId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: quiz }, { data: questions }, { data: attempts }] = await Promise.all([
    supabase.from('quizzes').select('*').eq('id', params.quizId).eq('group_id', params.id).single(),
    supabase.from('quiz_questions').select('*').eq('quiz_id', params.quizId).order('order_index'),
    supabase.from('quiz_attempts').select('user_id, user_name, score, total, completed_at').eq('quiz_id', params.quizId),
  ])

  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const myAttempt = attempts?.find(a => a.user_id === user.id) ?? null

  return NextResponse.json({ quiz, questions: questions ?? [], attempts: attempts ?? [], myAttempt })
}

export async function POST(req: Request, { params }: { params: { id: string; quizId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json() // array of chosen indices

  const { data: questions } = await supabase.from('quiz_questions').select('correct_index').eq('quiz_id', params.quizId).order('order_index')
  if (!questions?.length) return NextResponse.json({ error: 'No questions' }, { status: 404 })

  let score = 0
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correct_index) score++
  }

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const userName = member?.display_name ?? user.email?.split('@')[0] ?? 'Student'

  const { data, error } = await supabase
    .from('quiz_attempts')
    .upsert({ quiz_id: params.quizId, user_id: user.id, user_name: userName, score, total: questions.length, answers, completed_at: new Date().toISOString() }, { onConflict: 'quiz_id,user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attempt: data, score, total: questions.length })
}
