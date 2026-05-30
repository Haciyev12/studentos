import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? ''
  const courseId = searchParams.get('courseId') ?? ''

  let query = supabase
    .from('course_groups')
    .select('id, name, course_name, description, invite_code, created_by, created_at, course_id')
    .order('created_at', { ascending: false })

  if (courseId) {
    query = query.or(`course_id.eq.${courseId},course_name.ilike.${name}`)
  } else if (name) {
    query = query.ilike('course_name', name)
  } else {
    return NextResponse.json([])
  }

  const [{ data: groups, error }, { data: myMemberships }] = await Promise.all([
    query,
    supabase.from('group_members').select('group_id').eq('user_id', user.id),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const myGroupIds = new Set((myMemberships ?? []).map(m => m.group_id))

  // Get member counts
  const groupIds = (groups ?? []).map(g => g.id)
  const { data: memberCounts } = groupIds.length
    ? await supabase.from('group_members').select('group_id').in('group_id', groupIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  const result = (groups ?? []).map(g => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
    is_member: myGroupIds.has(g.id),
  }))

  return NextResponse.json(result)
}
