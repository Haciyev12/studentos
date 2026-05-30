import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', params.id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, message_type, deadline_id, deadline_title } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data: member } = await supabase
    .from('group_members')
    .select('display_name, avatar_emoji')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const senderName = member.display_name ?? user.email?.split('@')[0] ?? 'Student'

  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: params.id,
      user_id: user.id,
      sender_name: senderName,
      sender_emoji: member.avatar_emoji ?? '🎓',
      content: content.trim(),
      message_type: message_type ?? 'text',
      deadline_id: deadline_id ?? null,
      deadline_title: deadline_title ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
