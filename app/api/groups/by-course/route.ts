import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? ''
  const courseId = searchParams.get('courseId') ?? ''

  if (!name && !courseId) return NextResponse.json([])

  const baseSelect = 'id, name, course_name, description, invite_code, created_by, created_at'

  // Three parallel searches to maximise recall:
  // 1) group's course_name contains the course name
  // 2) group's own name contains the course name (catches "Calculus Study Group" with null course_name)
  // 3) group explicitly linked via course_id FK (requires migration 005)
  const queries: Promise<{ data: any[] | null; error: any }>[] = []

  if (name) {
    queries.push(
      supabase.from('course_groups').select(baseSelect)
        .ilike('course_name', `%${name}%`)
        .order('created_at', { ascending: false }) as any
    )
    queries.push(
      supabase.from('course_groups').select(baseSelect)
        .ilike('name', `%${name}%`)
        .order('created_at', { ascending: false }) as any
    )
  }

  if (courseId) {
    queries.push(
      supabase.from('course_groups').select(`${baseSelect}, course_id`)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false }) as any
    )
  }

  const results = await Promise.allSettled(queries)

  // Merge + deduplicate
  const seen = new Set<string>()
  const groups: any[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled' || r.value.error) continue
    for (const g of r.value.data ?? []) {
      if (!seen.has(g.id)) {
        seen.add(g.id)
        groups.push(g)
      }
    }
  }

  if (!groups.length) return NextResponse.json([])

  // Membership and counts
  const groupIds = groups.map(g => g.id)
  const [{ data: myMemberships }, { data: allMembers }] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('user_id', user.id).in('group_id', groupIds),
    supabase.from('group_members').select('group_id').in('group_id', groupIds),
  ])

  const myGroupIds = new Set((myMemberships ?? []).map(m => m.group_id))
  const countMap: Record<string, number> = {}
  for (const m of allMembers ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
  }

  return NextResponse.json(
    groups.map(g => ({
      ...g,
      member_count: countMap[g.id] ?? 0,
      is_member: myGroupIds.has(g.id),
    }))
  )
}
