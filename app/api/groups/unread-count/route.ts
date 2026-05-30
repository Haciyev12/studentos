import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ total: 0 })

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  if (!memberships?.length) return NextResponse.json({ total: 0 })

  const { data: reads } = await supabase
    .from('message_reads')
    .select('group_id, last_read_at')
    .eq('user_id', user.id)

  const readMap = new Map(reads?.map(r => [r.group_id, r.last_read_at]) ?? [])
  let total = 0

  for (const { group_id } of memberships) {
    const lastRead = readMap.get(group_id)
    const query = supabase
      .from('group_messages')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .neq('user_id', user.id)

    if (lastRead) query.gt('created_at', lastRead)

    const { count } = await query
    total += count ?? 0
  }

  return NextResponse.json({ total })
}
