import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_: Request, { params }: { params: { id: string; msgId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: msg } = await supabase.from('group_messages').select('is_pinned, group_id').eq('id', params.msgId).single()
  if (!msg || msg.group_id !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('group_messages').update({ is_pinned: !msg.is_pinned }).eq('id', params.msgId)
  return NextResponse.json({ pinned: !msg.is_pinned })
}
