import OpenAI from 'openai'
import type { ExtractedDeadline, DeadlineType } from '@/types'

const VALID_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

// Primary model — reliable free model for structured JSON output
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'
// Fallback if primary fails
const FALLBACK_MODEL = 'google/gemma-3-27b-it:free'

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

function buildPrompt(syllabusText: string): string {
  const currentYear = new Date().getFullYear()
  return `Extract every graded deadline from this university syllabus. Include assignments, quizzes, midterms, finals, projects, labs, presentations.

Return ONLY a raw JSON array (no markdown fences, no explanation). Each object must have:
- "title": concise name (e.g. "Midterm Exam", "Assignment 3")
- "type": exactly one of: "assignment", "quiz", "exam", "project", "other"
- "due_date": YYYY-MM-DD format. Use ${currentYear} if no year given. Estimate from week/month if needed.
- "description": brief string or null
- "weight": number (percentage of final grade, e.g. 15) or null

If no deadlines exist, return [].

Syllabus text:
${syllabusText.slice(0, 40000)}`
}

function parseJson(text: string): ExtractedDeadline[] {
  // Strip markdown fences if present
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  cleaned = cleaned.trim()

  // Find the JSON array
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []

  const raw = JSON.parse(cleaned.slice(start, end + 1)) as ExtractedDeadline[]
  return raw
    .filter(d => d.title && d.due_date && /^\d{4}-\d{2}-\d{2}$/.test(d.due_date))
    .map(d => ({
      title: String(d.title).slice(0, 255),
      type: VALID_TYPES.includes(d.type) ? d.type : 'other',
      due_date: d.due_date,
      description: d.description ? String(d.description).slice(0, 500) : null,
      weight: typeof d.weight === 'number' ? d.weight : null,
    }))
}

async function tryExtract(client: OpenAI, model: string, syllabusText: string): Promise<ExtractedDeadline[]> {
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [{ role: 'user', content: buildPrompt(syllabusText) }],
  })
  const text = completion.choices[0]?.message?.content ?? ''
  return parseJson(text)
}

export async function extractDeadlinesFromText(syllabusText: string): Promise<ExtractedDeadline[]> {
  const client = getClient()

  try {
    return await tryExtract(client, PRIMARY_MODEL, syllabusText)
  } catch (primaryErr) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed, trying fallback:`, primaryErr)
    try {
      return await tryExtract(client, FALLBACK_MODEL, syllabusText)
    } catch (fallbackErr) {
      throw new Error(`AI extraction failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`)
    }
  }
}
