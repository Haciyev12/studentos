import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params: _ }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { deadline_id, completed } = await req.json()
  if (!deadline_id) return NextResponse.json({ error: 'deadline_id required' }, { status: 400 })

  const { data: profile } = await supabase.from('user_profiles').select('display_name').eq('id', user.id).single()
  const userName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Student'

  if (completed) {
    await supabase.from('deadline_completions')
      .upsert({ deadline_id, user_id: user.id, user_name: userName, completed_at: new Date().toISOString() }, { onConflict: 'deadline_id,user_id' })
  } else {
    await supabase.from('deadline_completions').delete().eq('deadline_id', deadline_id).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
