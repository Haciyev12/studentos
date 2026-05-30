import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await req.json()
  if (!invite_code?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const { data: group } = await supabase
    .from('course_groups')
    .select('id, name')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .single()

  if (!group) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ group, already_member: true })

  const { data: profile } = await supabase.from('user_profiles').select('display_name, avatar_emoji').eq('id', user.id).single()
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Student'
  const emoji = profile?.avatar_emoji ?? '🎓'

  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, display_name: displayName, avatar_emoji: emoji })

  return NextResponse.json({ group })
}
