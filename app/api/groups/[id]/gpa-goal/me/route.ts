import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_gpa, current_gpa } = await req.json()

  const { data: goal } = await supabase.from('group_gpa_goals').select('id').eq('group_id', params.id).single()
  if (!goal) return NextResponse.json({ error: 'No goal set for this group yet' }, { status: 404 })

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const userName = member?.display_name ?? user.email?.split('@')[0] ?? 'Student'

  const achieved = current_gpa != null && target_gpa != null && current_gpa >= target_gpa

  const { data, error } = await supabase
    .from('member_gpa_targets')
    .upsert({ goal_id: goal.id, user_id: user.id, user_name: userName, target_gpa, current_gpa, achieved, updated_at: new Date().toISOString() }, { onConflict: 'goal_id,user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ target: data })
}
