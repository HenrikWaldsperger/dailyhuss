import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CatalogRow, HouseDesign } from "./village";

export interface VillageItem {
  id: string;
  kind: string;
  x: number;
  y: number;
  design: Json;
  decorations: string[];
}

export interface SavedDesign {
  id: string;
  name: string;
  design: Json;
}

export const coinsQueryOptions = queryOptions({
  queryKey: ["coins"],
  queryFn: async (): Promise<number> => {
    const { data, error } = await supabase.rpc("coin_balance");
    if (error) throw error;
    return data ?? 0;
  },
});

export const catalogQueryOptions = queryOptions({
  queryKey: ["village", "catalog"],
  queryFn: async (): Promise<CatalogRow[]> => {
    const { data, error } = await supabase.from("village_catalog").select("*").order("sort");
    if (error) throw error;
    return (data ?? []) as CatalogRow[];
  },
  staleTime: 60 * 60 * 1000,
});

export const villageItemsQueryOptions = queryOptions({
  queryKey: ["village", "items"],
  queryFn: async (): Promise<VillageItem[]> => {
    const { data, error } = await supabase.from("village_items").select("id, kind, x, y, design, decorations");
    if (error) throw error;
    return data ?? [];
  },
});

export const designUnlocksQueryOptions = queryOptions({
  queryKey: ["village", "unlocks"],
  queryFn: async (): Promise<string[]> => {
    const { data, error } = await supabase.from("design_unlocks").select("kind");
    if (error) throw error;
    return (data ?? []).map((r) => r.kind);
  },
});

export const savedDesignsQueryOptions = queryOptions({
  queryKey: ["village", "designs"],
  queryFn: async (): Promise<SavedDesign[]> => {
    const { data, error } = await supabase.from("village_designs").select("id, name, design").order("created_at");
    if (error) throw error;
    return data ?? [];
  },
});

/** Turns a database error into the readable German message raised by the village functions. */
export function villageError(e: unknown): string {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  return msg || "Das hat nicht geklappt.";
}

function useVillageMutation<A, R>(fn: (a: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ["coins"] }), qc.invalidateQueries({ queryKey: ["village"] })]),
  });
}

export function useVillageActions() {

  const buy = useVillageMutation(async (a: { kind: string; x: number; y: number; design?: HouseDesign | undefined }) => {
    const { data, error } = await supabase.rpc("village_buy", { _kind: a.kind, _x: a.x, _y: a.y, _design: (a.design ?? {}) as unknown as Json });
    if (error) throw error;
    return data;
  });
  const decorate = useVillageMutation(async (a: { item: string; decoration: string }) => {
    const { error } = await supabase.rpc("village_decorate", { _item: a.item, _decoration: a.decoration });
    if (error) throw error;
  });
  const removeDecoration = useVillageMutation(async (a: { item: string; decoration: string }) => {
    const { error } = await supabase.rpc("village_remove_decoration", { _item: a.item, _decoration: a.decoration });
    if (error) throw error;
  });
  const sell = useVillageMutation(async (item: string) => {
    const { data, error } = await supabase.rpc("village_sell", { _item: item });
    if (error) throw error;
    return data;
  });
  const unlock = useVillageMutation(async (kind: string) => {
    const { error } = await supabase.rpc("village_unlock_design", { _kind: kind });
    if (error) throw error;
  });
  const move = useVillageMutation(async (a: { item: string; x: number; y: number }) => {
    const { error } = await supabase.from("village_items").update({ x: a.x, y: a.y }).eq("id", a.item);
    if (error) throw error;
  });
  const paint = useVillageMutation(async (a: { item: string; design: HouseDesign }) => {
    const { error } = await supabase.from("village_items").update({ design: a.design as unknown as Json }).eq("id", a.item);
    if (error) throw error;
  });
  const saveDesign = useVillageMutation(async (a: { name: string; design: HouseDesign }) => {
    const { error } = await supabase.from("village_designs").insert({ name: a.name, design: a.design as unknown as Json });
    if (error) throw error;
  });
  const deleteDesign = useVillageMutation(async (id: string) => {
    const { error } = await supabase.from("village_designs").delete().eq("id", id);
    if (error) throw error;
  });
  return { buy, decorate, removeDecoration, sell, unlock, move, paint, saveDesign, deleteDesign };
}
