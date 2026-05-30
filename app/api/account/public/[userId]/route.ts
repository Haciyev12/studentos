import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_emoji, photo_url, major, graduating_year, linkedin_url')
    .eq('id', params.userId)
    .single()

  return NextResponse.json(data ?? { id: params.userId, display_name: null, avatar_emoji: '🎓' })
}
