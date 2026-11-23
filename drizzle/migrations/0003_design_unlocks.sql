ALTER TABLE public.village_catalog DROP CONSTRAINT village_catalog_category_check;
ALTER TABLE public.village_catalog ADD CONSTRAINT village_catalog_category_check
  CHECK (category IN ('house', 'building', 'nature', 'decoration', 'design'));

INSERT INTO public.village_catalog (kind, category, price, sort) VALUES
  ('paint:lavender', 'design', 30, 50),
  ('paint:mint', 'design', 30, 51),
  ('paint:rose', 'design', 30, 52),
  ('paint:midnight', 'design', 40, 53),
  ('paint:gold', 'design', 60, 54),
  ('roof:dome', 'design', 50, 60),
  ('roof:castle', 'design', 70, 61),
  ('window:arch', 'design', 30, 70),
  ('window:heart', 'design', 40, 71),
  ('window:stained', 'design', 50, 72);

CREATE TABLE public.design_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL REFERENCES public.village_catalog(kind),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);
GRANT SELECT ON public.design_unlocks TO authenticated;
GRANT ALL ON public.design_unlocks TO service_role;
ALTER TABLE public.design_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own design unlocks" ON public.design_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.village_unlock_design(_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  design_price integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich an.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  SELECT price INTO design_price FROM public.village_catalog WHERE kind = _kind AND category = 'design';
  IF design_price IS NULL THEN RAISE EXCEPTION 'Dieses Design gibt es nicht.'; END IF;
  IF EXISTS (SELECT 1 FROM public.design_unlocks WHERE user_id = uid AND kind = _kind) THEN
    RAISE EXCEPTION 'Schon freigeschaltet.';
  END IF;
  IF public.coin_balance() < design_price THEN RAISE EXCEPTION 'Nicht genug Taler.'; END IF;
  INSERT INTO public.design_unlocks (user_id, kind) VALUES (uid, _kind);
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (uid, -design_price, 'unlock:' || _kind);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.village_unlock_design(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.village_unlock_design(text) TO authenticated;

-- A house design may only use free options or ones the owner unlocked.
CREATE OR REPLACE FUNCTION public.validate_village_design()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  needed text[];
  k text;
BEGIN
  IF NEW.design = '{}'::jsonb OR (TG_OP = 'UPDATE' AND NEW.design = OLD.design) THEN
    RETURN NEW;
  END IF;
  needed := ARRAY[
    'paint:' || COALESCE(NEW.design->>'wall', ''),
    'paint:' || COALESCE(NEW.design->>'roof', ''),
    'paint:' || COALESCE(NEW.design->>'door', ''),
    'roof:' || COALESCE(NEW.design->>'roofStyle', ''),
    'window:' || COALESCE(NEW.design->>'windows', '')
  ];
  FOREACH k IN ARRAY needed LOOP
    IF EXISTS (SELECT 1 FROM public.village_catalog WHERE kind = k AND category = 'design')
       AND NOT EXISTS (SELECT 1 FROM public.design_unlocks WHERE user_id = NEW.user_id AND kind = k) THEN
      RAISE EXCEPTION 'Dieses Design ist noch nicht freigeschaltet.';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER village_items_validate_design BEFORE INSERT OR UPDATE ON public.village_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_village_design();