REVOKE ALL ON public.village_items FROM anon, authenticated;
GRANT SELECT ON public.village_items TO authenticated;
GRANT UPDATE (x, y, design) ON public.village_items TO authenticated;

REVOKE ALL ON public.coin_transactions FROM anon, authenticated;
GRANT SELECT ON public.coin_transactions TO authenticated;

REVOKE ALL ON public.design_unlocks FROM anon, authenticated;
GRANT SELECT ON public.design_unlocks TO authenticated;

REVOKE ALL ON public.village_catalog FROM anon, authenticated;
GRANT SELECT ON public.village_catalog TO authenticated;

REVOKE ALL ON public.village_designs FROM anon;
REVOKE ALL ON public.reward_unlocks FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.reward_unlocks FROM authenticated;
REVOKE ALL ON public.coach_messages FROM anon;