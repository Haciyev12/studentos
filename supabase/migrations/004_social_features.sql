-- Migration 004: Study Groups & Social Features

-- User profiles (display names, avatars)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_emoji TEXT DEFAULT '🎓',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Course groups
CREATE TABLE IF NOT EXISTS public.course_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_name TEXT,
  section TEXT,
  description TEXT,
  invite_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select" ON public.course_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON public.course_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_update" ON public.course_groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "groups_delete" ON public.course_groups FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Group membership
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_emoji TEXT DEFAULT '🎓',
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = gid AND user_id = auth.uid());
$$;

CREATE POLICY "members_select" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id) OR user_id = auth.uid());
CREATE POLICY "members_insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON public.group_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members_delete" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Group chat messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_emoji TEXT DEFAULT '🎓',
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'deadline_ping')),
  deadline_id UUID REFERENCES public.deadlines(id) ON DELETE SET NULL,
  deadline_title TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY "messages_insert" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "messages_update" ON public.group_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
END $$;

-- Message read tracking
CREATE TABLE IF NOT EXISTS public.message_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads_all" ON public.message_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Shared deadline board
CREATE TABLE IF NOT EXISTS public.group_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES public.deadlines(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, deadline_id)
);
ALTER TABLE public.group_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_select" ON public.group_deadlines FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "gd_insert" ON public.group_deadlines FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "gd_delete" ON public.group_deadlines FOR DELETE TO authenticated USING (added_by = auth.uid());

-- Deadline completions
CREATE TABLE IF NOT EXISTS public.deadline_completions (
  deadline_id UUID NOT NULL REFERENCES public.deadlines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (deadline_id, user_id)
);
ALTER TABLE public.deadline_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc_select" ON public.deadline_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dc_insert" ON public.deadline_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "dc_delete" ON public.deadline_completions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Pokes
CREATE TABLE IF NOT EXISTS public.pokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_name TEXT,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline_title TEXT,
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pokes_select" ON public.pokes FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "pokes_insert" ON public.pokes FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "pokes_update" ON public.pokes FOR UPDATE TO authenticated USING (to_user_id = auth.uid());

-- Collaborative notes
CREATE TABLE IF NOT EXISTS public.group_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  topic TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT,
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_editor_name TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select" ON public.group_notes FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "notes_insert" ON public.group_notes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "notes_update" ON public.group_notes FOR UPDATE TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "notes_delete" ON public.group_notes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Note version history
CREATE TABLE IF NOT EXISTS public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.group_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  editor_name TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nv_select" ON public.note_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_notes n WHERE n.id = note_id AND public.is_group_member(n.group_id)));
CREATE POLICY "nv_insert" ON public.note_versions FOR INSERT TO authenticated WITH CHECK (edited_by = auth.uid());

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_select" ON public.quizzes FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "quiz_insert" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "quiz_update" ON public.quizzes FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "quiz_delete" ON public.quizzes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  order_index INTEGER DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.quiz_group_id(qid UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT group_id FROM public.quizzes WHERE id = qid;
$$;
CREATE POLICY "qq_select" ON public.quiz_questions FOR SELECT TO authenticated
  USING (public.is_group_member(public.quiz_group_id(quiz_id)));
CREATE POLICY "qq_insert" ON public.quiz_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));
CREATE POLICY "qq_delete" ON public.quiz_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));

-- Quiz attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  answers JSONB,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_select" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (public.is_group_member(public.quiz_group_id(quiz_id)));
CREATE POLICY "qa_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "qa_update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Group GPA goals
CREATE TABLE IF NOT EXISTS public.group_gpa_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE UNIQUE,
  target_gpa DECIMAL(3,2) NOT NULL CHECK (target_gpa >= 0 AND target_gpa <= 4),
  semester TEXT,
  anonymous_mode BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_gpa_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gg_select" ON public.group_gpa_goals FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "gg_insert" ON public.group_gpa_goals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_group_member(group_id));
CREATE POLICY "gg_update" ON public.group_gpa_goals FOR UPDATE TO authenticated USING (public.is_group_member(group_id));

-- Member GPA targets
CREATE TABLE IF NOT EXISTS public.member_gpa_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.group_gpa_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  target_gpa DECIMAL(3,2),
  current_gpa DECIMAL(3,2),
  achieved BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, user_id)
);
ALTER TABLE public.member_gpa_targets ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.goal_group_id(gid UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT group_id FROM public.group_gpa_goals WHERE id = gid;
$$;
CREATE POLICY "mgt_select" ON public.member_gpa_targets FOR SELECT TO authenticated
  USING (public.is_group_member(public.goal_group_id(goal_id)));
CREATE POLICY "mgt_insert" ON public.member_gpa_targets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mgt_update" ON public.member_gpa_targets FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mgt_delete" ON public.member_gpa_targets FOR DELETE TO authenticated USING (user_id = auth.uid());
