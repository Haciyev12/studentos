import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getDisplayName(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile } = await supabase.from('user_profiles').select('display_name, avatar_emoji').eq('id', userId).single()
  if (profile?.display_name) return { name: profile.display_name, emoji: profile.avatar_emoji ?? '🎓' }
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.email?.split('@')[0] ?? 'Student'
  return { name, emoji: '🎓' }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, joined_at, course_groups(id, name, course_name, section, invite_code, created_by, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ groups: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, course_name, section, description, course_id } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data: group, error: groupError } = await supabase
    .from('course_groups')
    .insert({ name: name.trim(), course_name: course_name?.trim(), section: section?.trim(), description: description?.trim(), created_by: user.id, course_id: course_id ?? null })
    .select()
    .single()

  if (groupError || !group) return NextResponse.json({ error: groupError?.message ?? 'Failed to create group' }, { status: 500 })

  const { name: displayName, emoji } = await getDisplayName(supabase, user.id)
  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin', display_name: displayName, avatar_emoji: emoji })

  return NextResponse.json({ group })
}
