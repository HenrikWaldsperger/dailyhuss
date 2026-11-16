CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  emoji text NOT NULL DEFAULT '✨' CHECK (char_length(emoji) <= 16),
  color text NOT NULL DEFAULT 'lagoon' CHECK (char_length(color) <= 20),
  unit text NOT NULL DEFAULT 'mal' CHECK (char_length(unit) BETWEEN 1 AND 20),
  target numeric NOT NULL CHECK (target > 0),
  step numeric NOT NULL DEFAULT 1 CHECK (step > 0),
  direction text NOT NULL DEFAULT 'at_least' CHECK (direction IN ('at_least','at_most')),
  period text NOT NULL DEFAULT 'daily' CHECK (period IN ('daily','total')),
  deadline date,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own habits" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own habits" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX habits_user_idx ON public.habits(user_id);

CREATE TABLE public.habit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entry_date date NOT NULL,
  value numeric NOT NULL DEFAULT 0 CHECK (value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, entry_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_entries TO authenticated;
GRANT ALL ON public.habit_entries TO service_role;

ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entries" ON public.habit_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own entries" ON public.habit_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
CREATE POLICY "Users update own entries" ON public.habit_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
CREATE POLICY "Users delete own entries" ON public.habit_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX habit_entries_user_date_idx ON public.habit_entries(user_id, entry_date);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER habits_touch BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER habit_entries_touch BEFORE UPDATE ON public.habit_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();