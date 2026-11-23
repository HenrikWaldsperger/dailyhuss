CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_messages_user_created_idx ON public.coach_messages (user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coach messages" ON public.coach_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own coach messages" ON public.coach_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own coach messages" ON public.coach_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reward_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  reward_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_key)
);
GRANT SELECT, INSERT ON public.reward_unlocks TO authenticated;
GRANT ALL ON public.reward_unlocks TO service_role;
ALTER TABLE public.reward_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rewards" ON public.reward_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own rewards" ON public.reward_unlocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);