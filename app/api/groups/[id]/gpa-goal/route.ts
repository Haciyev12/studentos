import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: goal } = await supabase.from('group_gpa_goals').select('*').eq('group_id', params.id).single()
  if (!goal) return NextResponse.json({ goal: null, members: [] })

  const { data: targets } = await supabase.from('member_gpa_targets').select('*').eq('goal_id', goal.id)
  return NextResponse.json({ goal, members: targets ?? [] })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_gpa, semester, anonymous_mode } = await req.json()
  if (target_gpa == null) return NextResponse.json({ error: 'target_gpa required' }, { status: 400 })

  const { data, error } = await supabase
    .from('group_gpa_goals')
    .upsert({ group_id: params.id, target_gpa, semester, anonymous_mode: anonymous_mode ?? true, created_by: user.id }, { onConflict: 'group_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}
