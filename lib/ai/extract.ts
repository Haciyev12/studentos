import OpenAI from 'openai'
import type { ExtractedDeadline, DeadlineType } from '@/types'

const VALID_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

// Change this env var to switch models — any free model on openrouter.ai works.
// Default: google/gemma-3-27b-it:free  (fast, free, good at structured output)
const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemma-3-27b-it:free'

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY?.trim(),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Scholar',
    },
  })
}

export async function extractDeadlinesFromText(syllabusText: string): Promise<ExtractedDeadline[]> {
  const client = getClient()
  const truncated = syllabusText.slice(0, 50_000)
  const currentYear = new Date().getFullYear()

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are an academic deadline extractor. Extract every graded deadline from this university course syllabus: assignments, quizzes, exams, projects, and labs.

Return ONLY a valid JSON array — no markdown fences, no explanation, just raw JSON. Each item must have:
- "title": string (concise name, e.g. "Midterm Exam", "HW 3: Arrays")
- "type": one of "assignment" | "quiz" | "exam" | "project" | "other"
- "due_date": string in YYYY-MM-DD format. If no year is given, use ${currentYear}. Estimate if only a week/month is mentioned.
- "description": string | null
- "weight": number | null (percentage of final grade, e.g. 15 for 15%)

If the syllabus has no deadlines, return [].

Syllabus:
${truncated}`,
      },
    ],
  })

  const text = completion.choices[0]?.message?.content ?? ''

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const raw = JSON.parse(jsonMatch[0]) as ExtractedDeadline[]

  return raw
    .filter((d) => d.title && d.due_date && /^\d{4}-\d{2}-\d{2}$/.test(d.due_date))
    .map((d) => ({
      title: String(d.title).slice(0, 255),
      type: VALID_TYPES.includes(d.type) ? d.type : 'other',
      due_date: d.due_date,
      description: d.description ? String(d.description).slice(0, 500) : null,
      weight: typeof d.weight === 'number' ? d.weight : null,
    }))
}
