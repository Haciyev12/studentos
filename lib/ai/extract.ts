import OpenAI from 'openai'
import type { ExtractedDeadline, DeadlineType } from '@/types'

const VALID_TYPES: DeadlineType[] = ['assignment', 'quiz', 'exam', 'project', 'other']

// Model priority: try in order until one succeeds
function getModels(): string[] {
  const custom = process.env.OPENROUTER_MODEL
  const defaults = [
    'google/gemma-4-31b-it:free',
    'google/gemini-2.0-flash-exp:free',
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ]
  return custom ? [custom, ...defaults.filter(m => m !== custom)] : defaults
}

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

function buildPrompt(text: string): string {
  const year = new Date().getFullYear()
  return `Extract every graded deadline from this university course syllabus.

Return ONLY a raw JSON array — no markdown, no explanation. Each item:
{
  "title": "concise name",
  "type": "assignment" | "quiz" | "exam" | "project" | "other",
  "due_date": "YYYY-MM-DD",
  "description": "brief description or null",
  "weight": number_or_null
}

Rules:
- Use ${year} if no year given
- Estimate date from week/month references
- weight = percentage of final grade (e.g. 20 for 20%)
- Include assignments, quizzes, midterms, finals, projects, labs, presentations
- If no deadlines found, return []

Syllabus:
${text.slice(0, 45000)}`
}

function parseDeadlines(text: string): ExtractedDeadline[] {
  let s = text.trim()
  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end === -1) return []

  const raw = JSON.parse(s.slice(start, end + 1)) as ExtractedDeadline[]
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

export async function extractDeadlinesFromText(syllabusText: string): Promise<ExtractedDeadline[]> {
  const client = getClient()
  const models = getModels()
  const prompt = buildPrompt(syllabusText)
  let lastError: unknown

  for (const model of models) {
    try {
      console.log(`[AI] Trying model: ${model}`)
      const completion = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = completion.choices[0]?.message?.content ?? ''
      const results = parseDeadlines(text)
      console.log(`[AI] ${model} succeeded, extracted ${results.length} deadlines`)
      return results
    } catch (err) {
      console.warn(`[AI] ${model} failed:`, err instanceof Error ? err.message : err)
      lastError = err
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}
