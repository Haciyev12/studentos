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

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { syllabusId, question, history } = await req.json()
  if (!syllabusId || !question) return NextResponse.json({ error: 'Missing syllabusId or question' }, { status: 400 })

  const { data: syllabus } = await supabase
    .from('syllabi')
    .select('extracted_text, file_name, course_id')
    .eq('id', syllabusId)
    .eq('user_id', user.id)
    .single()

  if (!syllabus?.extracted_text) {
    return NextResponse.json({ error: 'Syllabus text not available. Please re-upload the PDF.' }, { status: 404 })
  }

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    {
      role: 'system',
      content: `You are an AI study assistant helping a student understand their course syllabus. Answer questions based on the syllabus content below. Be concise, helpful, and specific. If information is not in the syllabus, say so clearly.

SYLLABUS CONTENT:
${syllabus.extracted_text.slice(0, 30000)}`,
    },
    ...(history ?? []).slice(-6),
    { role: 'user', content: question },
  ]

  const client = getClient()
  const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemma-4-31b-it:free'

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 800,
    temperature: 0.3,
  })

  const answer = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'
  return NextResponse.json({ answer })
}
