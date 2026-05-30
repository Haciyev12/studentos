-- Migration 005: Account enhancements & Course-Group integration

-- Enhance user_profiles with academic details
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS major TEXT,
  ADD COLUMN IF NOT EXISTS graduating_year INT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add in_progress flag to grades for "not yet graded" placeholder entries
-- These are excluded from GPA calculation and shown as pending
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS in_progress BOOLEAN DEFAULT false;

-- Link course_groups to a specific course (optional FK for tighter integration)
ALTER TABLE public.course_groups
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_groups_course_id ON public.course_groups(course_id);
