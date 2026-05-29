import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedDeadline, DeadlineType } from '@/types'

const client = new Anthropic()

const VALID_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

export async function extractDeadlinesFromText(syllabusText: string): Promise<ExtractedDeadline[]> {
  const truncated = syllabusText.slice(0, 50_000)
  const currentYear = new Date().getFullYear()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are an academic deadline extractor. Extract every graded deadline from this university course syllabus: assignments, quizzes, exams, projects, and labs.

Return ONLY a valid JSON array — no markdown, no explanation, just raw JSON. Each item must have:
- "title": string (concise name, e.g. "Midterm Exam", "HW 3: Arrays")
- "type": one of "assignment" | "quiz" | "exam" | "project" | "other"
- "due_date": string in YYYY-MM-DD format. If no year is given, use ${currentYear}. If only a month/week is given, estimate the date.
- "description": string | null (optional extra context)
- "weight": number | null (percentage of final grade, e.g. 15 for 15%)

If the syllabus has no deadlines, return [].

Syllabus:
${truncated}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

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
