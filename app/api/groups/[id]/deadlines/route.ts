import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: gd, error } = await supabase
    .from('group_deadlines')
    .select('id, deadline_id, added_by, added_at, deadlines(id, title, type, due_date, description, weight, course_id, user_id)')
    .eq('group_id', params.id)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const deadlineIds = (gd ?? []).map(d => d.deadline_id)
  let completions: { deadline_id: string; user_id: string; user_name: string | null }[] = []
  if (deadlineIds.length > 0) {
    const { data: c } = await supabase
      .from('deadline_completions')
      .select('deadline_id, user_id, user_name')
      .in('deadline_id', deadlineIds)
    completions = c ?? []
  }

  return NextResponse.json({ deadlines: gd, completions })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deadline_id } = await req.json()
  if (!deadline_id) return NextResponse.json({ error: 'deadline_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('group_deadlines')
    .insert({ group_id: params.id, deadline_id, added_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deadline_id } = await req.json()
  await supabase.from('group_deadlines').delete().eq('group_id', params.id).eq('deadline_id', deadline_id).eq('added_by', user.id)
  return NextResponse.json({ ok: true })
}
