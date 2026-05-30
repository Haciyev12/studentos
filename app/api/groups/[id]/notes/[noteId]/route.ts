import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string; noteId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: note }, { data: versions }] = await Promise.all([
    supabase.from('group_notes').select('*').eq('id', params.noteId).eq('group_id', params.id).single(),
    supabase.from('note_versions').select('version, editor_name, created_at').eq('note_id', params.noteId).order('version', { ascending: false }).limit(10),
  ])

  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ note, versions: versions ?? [] })
}

export async function PUT(req: Request, { params }: { params: { id: string; noteId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, title, topic } = await req.json()

  const { data: existing } = await supabase.from('group_notes').select('version, content').eq('id', params.noteId).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const editorName = member?.display_name ?? user.email?.split('@')[0] ?? 'Student'
  const newVersion = (existing.version ?? 1) + 1

  await supabase.from('note_versions').insert({ note_id: params.noteId, content: existing.content, edited_by: user.id, editor_name: editorName, version: existing.version ?? 1 })

  const updates: Record<string, unknown> = { last_edited_by: user.id, last_editor_name: editorName, version: newVersion, updated_at: new Date().toISOString() }
  if (content !== undefined) updates.content = content
  if (title !== undefined) updates.title = title
  if (topic !== undefined) updates.topic = topic

  const { data, error } = await supabase.from('group_notes').update(updates).eq('id', params.noteId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(_: Request, { params }: { params: { id: string; noteId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('group_notes').delete().eq('id', params.noteId).eq('group_id', params.id)
  return NextResponse.json({ ok: true })
}
