import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_user_id, deadline_title } = await req.json()
  if (!to_user_id) return NextResponse.json({ error: 'to_user_id required' }, { status: 400 })
  if (to_user_id === user.id) return NextResponse.json({ error: 'Cannot poke yourself' }, { status: 400 })

  const { data: member } = await supabase.from('group_members').select('display_name').eq('group_id', params.id).eq('user_id', user.id).single()
  const fromName = member?.display_name ?? user.email?.split('@')[0] ?? 'Someone'

  await supabase.from('pokes').insert({ from_user_id: user.id, from_name: fromName, to_user_id, deadline_title, group_id: params.id })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ pokes: [] })

  const { data } = await supabase
    .from('pokes')
    .select('*')
    .eq('to_user_id', user.id)
    .eq('seen', false)
    .order('created_at', { ascending: false })

  return NextResponse.json({ pokes: data ?? [] })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { poke_id } = await req.json()
  await supabase.from('pokes').update({ seen: true }).eq('id', poke_id).eq('to_user_id', user.id)
  return NextResponse.json({ ok: true })
}
