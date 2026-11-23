CREATE TABLE public.village_catalog (
  kind text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('house', 'building', 'nature', 'decoration')),
  price integer NOT NULL CHECK (price >= 0),
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.village_catalog TO authenticated;
GRANT ALL ON public.village_catalog TO service_role;
ALTER TABLE public.village_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read catalog" ON public.village_catalog FOR SELECT TO authenticated USING (true);

INSERT INTO public.village_catalog (kind, category, price, sort) VALUES
  ('hut', 'house', 60, 1),
  ('cottage', 'house', 100, 2),
  ('tower', 'house', 160, 3),
  ('villa', 'house', 220, 4),
  ('well', 'building', 70, 10),
  ('windmill', 'building', 250, 11),
  ('bush', 'nature', 10, 20),
  ('flowerbed', 'nature', 15, 21),
  ('tree', 'nature', 20, 22),
  ('pine', 'nature', 25, 23),
  ('bench', 'nature', 20, 24),
  ('streetlamp', 'nature', 25, 25),
  ('pond', 'nature', 45, 26),
  ('flowerbox', 'decoration', 10, 30),
  ('flag', 'decoration', 10, 31),
  ('mailbox', 'decoration', 10, 32),
  ('fence', 'decoration', 15, 33),
  ('lantern', 'decoration', 15, 34),
  ('chimney', 'decoration', 20, 35),
  ('garland', 'decoration', 25, 36),
  ('cat', 'decoration', 30, 37);

CREATE TABLE public.village_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL REFERENCES public.village_catalog(kind),
  x integer NOT NULL CHECK (x BETWEEN 0 AND 5),
  y integer NOT NULL CHECK (y BETWEEN 0 AND 3),
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  decorations text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, x, y)
);
GRANT SELECT ON public.village_items TO authenticated;
GRANT UPDATE (x, y, design) ON public.village_items TO authenticated;
GRANT ALL ON public.village_items TO service_role;
ALTER TABLE public.village_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own village" ON public.village_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users move and paint own village" ON public.village_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.village_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_designs TO authenticated;
GRANT ALL ON public.village_designs TO service_role;
ALTER TABLE public.village_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own designs" ON public.village_designs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own designs" ON public.village_designs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own designs" ON public.village_designs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own designs" ON public.village_designs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coin_transactions_user_idx ON public.coin_transactions (user_id);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coin transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Coins per reward. Keep in sync with coinsForReward() in src/lib/village.ts.
CREATE OR REPLACE FUNCTION public.coin_value(_key text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _key ~ '^level:[0-9]{1,3}$' THEN 20 + 10 * substr(_key, 7)::integer
    WHEN _key IN ('badge:streak_30', 'badge:days_200', 'badge:perfect_10', 'badge:level_20') THEN 150
    WHEN _key = 'badge:level_10' THEN 100
    WHEN _key LIKE 'badge:%' THEN 50
    ELSE 0
  END
$$;

-- Only real badges and levels up to 100 may be stored as rewards.
CREATE OR REPLACE FUNCTION public.validate_reward_key()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reward_key ~ '^level:[0-9]{1,3}$' AND substr(NEW.reward_key, 7)::integer BETWEEN 2 AND 100 THEN
    RETURN NEW;
  END IF;
  IF NEW.reward_key IN ('badge:first_habit','badge:first_day','badge:variety','badge:streak_3','badge:streak_7','badge:streak_30','badge:perfect_day','badge:perfect_10','badge:days_50','badge:days_200','badge:goal_done','badge:level_5','badge:level_10','badge:level_20') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Unbekannte Belohnung: %', NEW.reward_key;
END;
$$;
CREATE TRIGGER reward_unlocks_validate BEFORE INSERT ON public.reward_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.validate_reward_key();

CREATE OR REPLACE FUNCTION public.coin_balance()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 0 ELSE
    100
    + COALESCE((SELECT sum(public.coin_value(reward_key)) FROM public.reward_unlocks WHERE user_id = auth.uid()), 0)::integer
    + COALESCE((SELECT sum(amount) FROM public.coin_transactions WHERE user_id = auth.uid()), 0)::integer
  END
$$;

CREATE OR REPLACE FUNCTION public.village_buy(_kind text, _x integer, _y integer, _design jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  item_price integer;
  item_category text;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich an.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  SELECT price, category INTO item_price, item_category FROM public.village_catalog WHERE kind = _kind;
  IF item_price IS NULL OR item_category = 'decoration' THEN RAISE EXCEPTION 'Das gibt es nicht zu kaufen.'; END IF;
  IF _x NOT BETWEEN 0 AND 5 OR _y NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Ungültiger Bauplatz.'; END IF;
  IF EXISTS (SELECT 1 FROM public.village_items WHERE user_id = uid AND x = _x AND y = _y) THEN
    RAISE EXCEPTION 'Dieser Bauplatz ist schon belegt.';
  END IF;
  IF public.coin_balance() < item_price THEN RAISE EXCEPTION 'Nicht genug Taler.'; END IF;
  INSERT INTO public.village_items (user_id, kind, x, y, design)
    VALUES (uid, _kind, _x, _y, CASE WHEN item_category = 'house' THEN COALESCE(_design, '{}'::jsonb) ELSE '{}'::jsonb END)
    RETURNING id INTO new_id;
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (uid, -item_price, 'buy:' || _kind);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.village_decorate(_item uuid, _decoration text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  deco_price integer;
  item_kind text;
  current_decos text[];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich an.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  SELECT price INTO deco_price FROM public.village_catalog WHERE kind = _decoration AND category = 'decoration';
  IF deco_price IS NULL THEN RAISE EXCEPTION 'Diese Deko gibt es nicht.'; END IF;
  SELECT i.kind, i.decorations INTO item_kind, current_decos
    FROM public.village_items i JOIN public.village_catalog c ON c.kind = i.kind
    WHERE i.id = _item AND i.user_id = uid AND c.category = 'house';
  IF item_kind IS NULL THEN RAISE EXCEPTION 'Nur deine Häuser lassen sich dekorieren.'; END IF;
  IF _decoration = ANY (current_decos) THEN RAISE EXCEPTION 'Diese Deko hat das Haus schon.'; END IF;
  IF public.coin_balance() < deco_price THEN RAISE EXCEPTION 'Nicht genug Taler.'; END IF;
  UPDATE public.village_items SET decorations = array_append(decorations, _decoration) WHERE id = _item;
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (uid, -deco_price, 'decorate:' || _decoration);
END;
$$;

CREATE OR REPLACE FUNCTION public.village_remove_decoration(_item uuid, _decoration text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Bitte melde dich an.'; END IF;
  UPDATE public.village_items SET decorations = array_remove(decorations, _decoration)
    WHERE id = _item AND user_id = auth.uid();
END;
$$;

-- Demolishing refunds half of the building price.
CREATE OR REPLACE FUNCTION public.village_sell(_item uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  refund integer;
  item_kind text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich an.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  SELECT i.kind, c.price / 2 INTO item_kind, refund
    FROM public.village_items i JOIN public.village_catalog c ON c.kind = i.kind
    WHERE i.id = _item AND i.user_id = uid;
  IF item_kind IS NULL THEN RAISE EXCEPTION 'Nicht gefunden.'; END IF;
  DELETE FROM public.village_items WHERE id = _item;
  IF refund > 0 THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (uid, refund, 'sell:' || item_kind);
  END IF;
  RETURN refund;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coin_balance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.village_buy(text, integer, integer, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.village_decorate(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.village_remove_decoration(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.village_sell(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coin_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.village_buy(text, integer, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.village_decorate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.village_remove_decoration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.village_sell(uuid) TO authenticated;