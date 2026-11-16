import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Habit, HabitDirection, HabitEntry, HabitPeriod } from "./habits";

export const habitsQueryOptions = queryOptions({
  queryKey: ["habits"],
  queryFn: async (): Promise<Habit[]> => {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((h) => ({
      ...h,
      target: Number(h.target),
      step: Number(h.step),
      direction: h.direction as HabitDirection,
      period: h.period as HabitPeriod,
    }));
  },
});

const PAGE = 1000;

export const entriesQueryOptions = queryOptions({
  queryKey: ["entries"],
  queryFn: async (): Promise<HabitEntry[]> => {
    const all: HabitEntry[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("habit_entries")
        .select("id, habit_id, entry_date, value")
        .order("entry_date", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data ?? []).map((e) => ({ ...e, value: Number(e.value) }));
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    return all;
  },
});

export interface HabitInput {
  name: string;
  emoji: string;
  color: string;
  unit: string;
  target: number;
  step: number;
  direction: HabitDirection;
  period: HabitPeriod;
  deadline: string | null;
}

export function useSaveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string | undefined; input: HabitInput }) => {
      if (id) {
        const { error } = await supabase.from("habits").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("habits").insert(input).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

/** Set the value of one habit on one day (optimistic). */
export function useSetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["setEntry"],
    mutationFn: async ({ habitId, date, value }: { habitId: string; date: string; value: number }) => {
      const { error } = await supabase
        .from("habit_entries")
        .upsert(
          { habit_id: habitId, entry_date: date, value: Math.max(0, value) },
          { onConflict: "habit_id,entry_date" },
        );
      if (error) throw error;
    },
    onMutate: async ({ habitId, date, value }) => {
      await qc.cancelQueries({ queryKey: ["entries"] });
      const prev = qc.getQueryData<HabitEntry[]>(["entries"]);
      qc.setQueryData<HabitEntry[]>(["entries"], (old = []) => {
        const idx = old.findIndex((e) => e.habit_id === habitId && e.entry_date === date);
        const next = [...old];
        const v = Math.max(0, value);
        const cur = idx >= 0 ? next[idx] : undefined;
        if (cur) next[idx] = { ...cur, value: v };
        else next.push({ id: `tmp-${habitId}-${date}`, habit_id: habitId, entry_date: date, value: v });
        return next;
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["entries"], ctx.prev);
    },
    onSettled: () => {
      // Refetch only once the last rapid tap has been saved, so counters don't flicker.
      if (qc.isMutating({ mutationKey: ["setEntry"] }) <= 1) {
        qc.invalidateQueries({ queryKey: ["entries"] });
      }
    },
  });
}
