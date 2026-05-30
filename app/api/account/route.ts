import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data ?? {
    id: user.id,
    display_name: null,
    avatar_emoji: '🎓',
    major: null,
    graduating_year: null,
    linkedin_url: null,
    photo_url: null,
  })
}

export async function PUT(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name, avatar_emoji, major, graduating_year, linkedin_url, photo_url } = await req.json()

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      display_name: display_name?.trim() || null,
      avatar_emoji: avatar_emoji || '🎓',
      major: major?.trim() || null,
      graduating_year: graduating_year ? Number(graduating_year) : null,
      linkedin_url: linkedin_url?.trim() || null,
      photo_url: photo_url?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
