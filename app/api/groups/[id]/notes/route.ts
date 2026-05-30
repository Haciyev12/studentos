import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_notes')
    .select('id, title, topic, creator_name, last_editor_name, version, created_at, updated_at')
    .eq('group_id', params.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content, topic } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const name = member?.display_name ?? user.email?.split('@')[0] ?? 'Student'

  const { data, error } = await supabase
    .from('group_notes')
    .insert({ group_id: params.id, title: title.trim(), content: content ?? '', topic: topic?.trim(), created_by: user.id, creator_name: name, last_edited_by: user.id, last_editor_name: name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
