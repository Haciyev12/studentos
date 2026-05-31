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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Only admin can update group settings
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can edit group settings' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if ('course_id' in body) updates.course_id = body.course_id ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('course_groups').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When a course is linked, sync all existing deadlines for that course into the group
  const newCourseId = updates.course_id as string | null
  if (newCourseId) {
    const { data: deadlines } = await supabase
      .from('deadlines')
      .select('id')
      .eq('course_id', newCourseId)
      .eq('user_id', user.id)

    if (deadlines && deadlines.length > 0) {
      const rows = deadlines.map((d: { id: string }) => ({
        group_id: params.id,
        deadline_id: d.id,
        added_by: user.id,
      }))
      // Ignore duplicates silently
      await supabase.from('group_deadlines').upsert(rows, { onConflict: 'group_id,deadline_id', ignoreDuplicates: true })
    }
  }

  return NextResponse.json({ ok: true, synced: newCourseId ? true : false })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Leave group
  await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
