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

  // Use separate queries and combine to avoid PostgREST or() ilike issues
  const [nameResult, idResult] = await Promise.allSettled([
    name
      ? supabase.from('course_groups').select(baseSelect).ilike('course_name', name).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null }),
    courseId
      ? supabase.from('course_groups').select(`${baseSelect}, course_id`).eq('course_id', courseId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const byName = nameResult.status === 'fulfilled' ? (nameResult.value.data ?? []) : []
  const byId = idResult.status === 'fulfilled' && !idResult.value.error ? (idResult.value.data ?? []) : []

  // Deduplicate by id
  const seen = new Set<string>()
  const groups = [...byName, ...byId].filter(g => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  })

  if (!groups.length) return NextResponse.json([])

  // Get my memberships and member counts in parallel
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
