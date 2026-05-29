-- ============================================================
-- Scholar — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  university  TEXT,
  major       TEXT,
  semester    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Courses
CREATE TABLE public.courses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT,
  professor   TEXT,
  credits     SMALLINT DEFAULT 3,
  color       TEXT DEFAULT '#6366F1' NOT NULL,
  semester    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Syllabi
CREATE TABLE public.syllabi (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       BIGINT,
  status          TEXT DEFAULT 'pending' NOT NULL
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message   TEXT,
  extracted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Deadlines
CREATE TABLE public.deadlines (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  syllabus_id     UUID REFERENCES public.syllabi(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'other' NOT NULL
                    CHECK (type IN ('assignment', 'quiz', 'exam', 'project', 'other')),
  due_date        DATE NOT NULL,
  weight          DECIMAL(5, 2),
  completed       BOOLEAN DEFAULT FALSE NOT NULL,
  manually_edited BOOLEAN DEFAULT FALSE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles: own select"  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own insert"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: own update"  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses
CREATE POLICY "courses: own all"   ON public.courses   FOR ALL USING (auth.uid() = user_id);

-- Syllabi
CREATE POLICY "syllabi: own all"   ON public.syllabi   FOR ALL USING (auth.uid() = user_id);

-- Deadlines
CREATE POLICY "deadlines: own all" ON public.deadlines FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabi', 'syllabi', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "syllabi storage: user upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'syllabi'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "syllabi storage: user select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'syllabi'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "syllabi storage: user delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'syllabi'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX deadlines_user_due ON public.deadlines (user_id, due_date);
CREATE INDEX deadlines_course    ON public.deadlines (course_id);
CREATE INDEX syllabi_course      ON public.syllabi   (course_id);
