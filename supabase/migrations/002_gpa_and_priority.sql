-- ============================================================
-- Migration 002: GPA tracking + deadline priority
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Grades table
CREATE TABLE public.grades (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_name  TEXT NOT NULL,
  course_code  TEXT,
  credits      DECIMAL(3,1) NOT NULL DEFAULT 3,
  grade_letter TEXT NOT NULL,
  grade_points DECIMAL(3,2) NOT NULL,
  semester     TEXT NOT NULL,
  year         SMALLINT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades: own all" ON public.grades FOR ALL USING (auth.uid() = user_id);
CREATE INDEX grades_user ON public.grades (user_id, year, semester);

-- Priority column on deadlines
ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));
