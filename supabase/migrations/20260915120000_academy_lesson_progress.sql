-- Per-user Academy progress. Course content remains versioned in the app until
-- the content-management phase; only user-owned state is stored here.
CREATE TABLE public.academy_lesson_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id text NOT NULL CHECK (char_length(lesson_id) BETWEEN 1 AND 100),
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own academy progress"
  ON public.academy_lesson_progress FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own academy progress"
  ON public.academy_lesson_progress FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own academy progress"
  ON public.academy_lesson_progress FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own academy progress"
  ON public.academy_lesson_progress FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.academy_lesson_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.academy_lesson_progress TO authenticated;

COMMENT ON TABLE public.academy_lesson_progress IS
  'Completed Academy lessons owned by each authenticated user.';
