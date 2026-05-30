import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from('course_groups').select('*').eq('id', params.id).single(),
    supabase.from('group_members').select('id, user_id, display_name, avatar_emoji, role, joined_at').eq('group_id', params.id),
  ])

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const isMember = members?.some(m => m.user_id === user.id)
  if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  return NextResponse.json({ group, members: members ?? [] })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Leave group
  await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
