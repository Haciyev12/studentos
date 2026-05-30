import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('message_reads').upsert({ user_id: user.id, group_id: params.id, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,group_id' })
  return NextResponse.json({ ok: true })
}
