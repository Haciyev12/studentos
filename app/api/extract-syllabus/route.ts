import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractDeadlinesFromText } from '@/lib/ai/extract'

// pdf-parse must run in Node.js runtime (not Edge).
// Importing the internal module avoids a test-file-read bug in the default export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const courseId = formData.get('course_id') as string | null

  if (!file || !courseId) {
    return NextResponse.json({ error: 'Missing file or course_id' }, { status: 400 })
  }

  if (!file.type.includes('pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 20 MB' }, { status: 400 })
  }

  // Verify course belongs to user
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Upload file to Supabase Storage
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const filePath = `${user.id}/${courseId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`

  const { error: uploadError } = await supabase.storage
    .from('syllabi')
    .upload(filePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Create syllabus record
  const { data: syllabus, error: syllabusError } = await supabase
    .from('syllabi')
    .insert({
      course_id: courseId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      status: 'processing',
    })
    .select()
    .single()

  if (syllabusError || !syllabus) {
    return NextResponse.json({ error: 'Failed to create syllabus record' }, { status: 500 })
  }

  // Parse PDF and extract text
  let syllabusText: string
  try {
    const pdfData = await pdfParse(fileBuffer)
    syllabusText = pdfData.text
  } catch (err) {
    await supabase
      .from('syllabi')
      .update({ status: 'failed', error_message: 'Failed to parse PDF' })
      .eq('id', syllabus.id)
    return NextResponse.json({ error: 'Failed to parse PDF — make sure it is not scanned/image-only' }, { status: 422 })
  }

  if (!syllabusText.trim()) {
    await supabase
      .from('syllabi')
      .update({ status: 'failed', error_message: 'PDF has no extractable text' })
      .eq('id', syllabus.id)
    return NextResponse.json({ error: 'This PDF has no extractable text (it may be a scanned image)' }, { status: 422 })
  }

  // Run AI extraction
  let extracted
  try {
    extracted = await extractDeadlinesFromText(syllabusText)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI extraction failed'
    await supabase
      .from('syllabi')
      .update({ status: 'failed', error_message: message })
      .eq('id', syllabus.id)
    return NextResponse.json({ error: `AI extraction failed: ${message}` }, { status: 500 })
  }

  // Bulk-insert deadlines
  if (extracted.length > 0) {
    const rows = extracted.map((d) => ({
      course_id: courseId,
      user_id: user.id,
      syllabus_id: syllabus.id,
      title: d.title,
      type: d.type,
      due_date: d.due_date,
      description: d.description,
      weight: d.weight,
    }))

    const { error: insertError } = await supabase.from('deadlines').insert(rows)

    if (insertError) {
      await supabase
        .from('syllabi')
        .update({ status: 'failed', error_message: insertError.message })
        .eq('id', syllabus.id)
      return NextResponse.json({ error: 'Failed to save deadlines' }, { status: 500 })
    }
  }

  // Mark as completed
  await supabase
    .from('syllabi')
    .update({ status: 'completed', extracted_at: new Date().toISOString() })
    .eq('id', syllabus.id)

  return NextResponse.json({ success: true, count: extracted.length, syllabus_id: syllabus.id })
}
