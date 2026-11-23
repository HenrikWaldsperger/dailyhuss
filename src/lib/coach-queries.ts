import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const coachMessagesQueryOptions = queryOptions({
  queryKey: ["coach"],
  queryFn: async (): Promise<UIMessage[]> => {
    const { data, error } = await supabase
      .from("coach_messages")
      .select("id, role, parts")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((m) => ({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: (Array.isArray(m.parts) ? m.parts : []) as unknown as UIMessage["parts"],
    }));
  },
  staleTime: Infinity,
});

export async function saveAssistantMessage(parts: UIMessage["parts"]) {
  const { error } = await supabase
    .from("coach_messages")
    .insert({ role: "assistant", parts: parts as unknown as Json });
  if (error) throw error;
}

export async function clearCoachMessages(userId: string) {
  const { error } = await supabase.from("coach_messages").delete().eq("user_id", userId);
  if (error) throw error;
}
