import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY?.trim(),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'ADA Scholar',
    },
  })
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)

  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('*, course:courses(name, code)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', in14Days.toISOString().split('T')[0])
    .order('due_date', { ascending: true })

  if (!deadlines?.length) {
    return NextResponse.json({
      schedule: "You have no upcoming deadlines in the next 14 days. Great time to review past material and get ahead on readings!",
      deadlineCount: 0,
    })
  }

  const deadlineList = deadlines.map((d) => {
    const course = (d.course as any)
    const daysUntil = Math.ceil((new Date(d.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return `- ${d.title} (${course?.code ?? course?.name ?? 'Unknown course'}) — ${d.type} — due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} on ${d.due_date}${d.priority === 'high' ? ' [HIGH PRIORITY]' : ''}`
  }).join('\n')

  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const prompt = `You are an academic advisor for an ADA University student. Today is ${todayStr}.

The student has these upcoming deadlines in the next 14 days:
${deadlineList}

Create a realistic, day-by-day study plan covering today through the most important deadlines. The plan should:
1. Prioritize exams and high-priority items heavily
2. Spread studying over multiple days rather than cramming
3. Include specific study activities (e.g., "review Chapter 3-5", "practice problems", "write outline")
4. Add short daily time estimates in hours
5. Leave some buffer days before exam/quiz deadlines
6. Be encouraging and practical

Format as clean markdown with each day as a bold heading (e.g., **Monday, May 29**), study tasks as bullet points under each day, and a brief note on what to focus on. Only include days that have study tasks. Keep it concise and actionable.`

  const client = getClient()
  const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemma-3-27b-it:free'

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.7,
  })

  const schedule = completion.choices[0]?.message?.content ?? 'Unable to generate schedule. Please try again.'

  return NextResponse.json({ schedule, deadlineCount: deadlines.length })
}
