export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  university: string | null
  major: string | null
  semester: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  user_id: string
  name: string
  code: string | null
  professor: string | null
  credits: number
  color: string
  semester: string | null
  created_at: string
  updated_at: string
}

export interface Syllabus {
  id: string
  course_id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  extracted_at: string | null
  created_at: string
}

export type DeadlineType = 'assignment' | 'quiz' | 'exam' | 'project' | 'other'

export interface Deadline {
  id: string
  course_id: string
  user_id: string
  syllabus_id: string | null
  title: string
  description: string | null
  type: DeadlineType
  due_date: string
  weight: number | null
  completed: boolean
  manually_edited: boolean
  created_at: string
  updated_at: string
  course?: Course
}

export interface ExtractedDeadline {
  title: string
  type: DeadlineType
  due_date: string
  description: string | null
  weight: number | null
}

export const COURSE_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#06B6D4',
] as const

export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  assignment: 'Assignment',
  quiz: 'Quiz',
  exam: 'Exam',
  project: 'Project',
  other: 'Other',
}

export const DEADLINE_TYPE_STYLES: Record<DeadlineType, string> = {
  exam: 'bg-red-500/10 text-red-400 border border-red-500/20',
  quiz: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  assignment: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  project: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
}

export const DEADLINE_TYPE_DOT: Record<DeadlineType, string> = {
  exam: 'bg-red-400',
  quiz: 'bg-orange-400',
  assignment: 'bg-blue-400',
  project: 'bg-violet-400',
  other: 'bg-zinc-400',
}
