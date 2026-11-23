import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { groupEntries } from "./habits";
import { entriesQueryOptions, habitsQueryOptions } from "./habits-queries";
import { computeStats, levelFromXp } from "./levels";

export interface RewardUnlock {
  reward_key: string;
  unlocked_at: string;
}

export const rewardsQueryOptions = queryOptions({
  queryKey: ["rewards"],
  queryFn: async (): Promise<RewardUnlock[]> => {
    const { data, error } = await supabase
      .from("reward_unlocks")
      .select("reward_key, unlocked_at")
      .order("unlocked_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

/** Live stats + level computed from the cached habits and entries. */
export function useProgress() {
  const habits = useQuery(habitsQueryOptions);
  const entries = useQuery(entriesQueryOptions);
  return useMemo(() => {
    if (!habits.data || !entries.data) return null;
    const stats = computeStats(habits.data, groupEntries(entries.data), new Date());
    return { stats, level: levelFromXp(stats.xp) };
  }, [habits.data, entries.data]);
}

/** Saves newly earned rewards; returns only the keys that were actually new. */
export async function saveUnlocks(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const { data, error } = await supabase
    .from("reward_unlocks")
    .upsert(
      keys.map((reward_key) => ({ reward_key })),
      { onConflict: "user_id,reward_key", ignoreDuplicates: true },
    )
    .select("reward_key");
  if (error) throw error;
  return (data ?? []).map((r) => r.reward_key);
}
