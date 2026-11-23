import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./ai/run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const HISTORY_LIMIT = 30;

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().max(200),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.record(z.unknown())).max(100),
      }).passthrough(),
    )
    .min(1)
    .max(500),
});

const SYSTEM_PROMPT = `Du bist Tung Tung Tung Sahur – ein gut gelaunter, energiegeladener Holzklotz mit Baseballschläger und Stirnband – und der Coach in der App „DailyHuss“, mit der Menschen tägliche Gewohnheiten und langfristige Ziele tracken.
Deine Art: verspielt und motivierend. Du startest gern mit „Tung tung tung!“ und klopfst sinnbildlich mit deinem Schläger, um die Person anzufeuern („Ich klopf dich wach!“). Übertreib den Meme-Humor nicht: Die Tipps selbst sind ernst gemeint, konkret und hilfreich. Niemals drohend oder gruselig.
Sprich immer Deutsch und duze die Person. Sei kurz (meist unter 180 Wörtern) und nutze Markdown-Listen, wenn es hilft.
Deine Stärken:
- Sportübungen und kurze Workouts (mit Sätzen/Wiederholungen, Ausführung, einfacher und schwerer Variante). Weise bei Schmerzen oder Vorerkrankungen darauf hin, ärztlichen Rat einzuholen.
- Tipps zu Trinken, Bildschirmzeit, Lernen, Lesen, Schlaf, Achtsamkeit und Motivation.
- Gewohnheiten realistisch planen: klein anfangen, an bestehende Routinen koppeln, Rückschläge normalisieren.
Beziehe dich, wenn passend, auf die Gewohnheiten und Fortschritte der Person (siehe unten). Erfinde keine Daten.
Du gibst keine medizinischen Diagnosen. Bei Themen wie Essstörungen, Selbstverletzung oder Krisen reagierst du einfühlsam und empfiehlst professionelle Hilfe (z. B. Telefonseelsorge 0800 111 0 111).`;

function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

function friendlyError(error: unknown): string {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (status === 429) return "Der Coach ist gerade sehr gefragt. Versuch es in einer Minute noch einmal.";
  if (status === 402) return "Das KI-Guthaben ist aufgebraucht. Bitte lade im Arbeitsbereich Guthaben nach.";
  if (status === 403) return "Der Coach ist für dieses Konto gerade nicht verfügbar.";
  return "Der Coach konnte gerade nicht antworten. Bitte versuch es noch einmal.";
}

export async function handleCoach(request: Request): Promise<Response> {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!SUPABASE_URL || !SUPABASE_KEY || !apiKey) return json(500, "Server ist nicht vollständig eingerichtet.");

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) return json(401, "Bitte melde dich an.");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", SUPABASE_KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) return json(401, "Bitte melde dich an.");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return json(400, "Ungültige Anfrage.");
  }
  const messages = body.messages as unknown as UIMessage[];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return json(400, "Die letzte Nachricht muss von dir sein.");
  const lastText = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
  if (!lastText || lastText.length > 4000) return json(400, "Nachricht ist leer oder zu lang.");

  const { error: saveUserError } = await supabase
    .from("coach_messages")
    .insert({ user_id: userId, role: "user", parts: last.parts as unknown as Json });
  if (saveUserError) {
    console.error("coach: saving user message failed", saveUserError);
    return json(500, "Deine Nachricht konnte nicht gespeichert werden.");
  }

  // Context about the user's habits (RLS limits this to their own rows).
  const since = format(subDays(new Date(), 13), "yyyy-MM-dd");
  const [{ data: habits }, { data: entries }] = await Promise.all([
    supabase.from("habits").select("id, name, emoji, unit, target, direction, period, deadline").eq("archived", false),
    supabase.from("habit_entries").select("habit_id, entry_date, value").gte("entry_date", since),
  ]);
  const habitLines = (habits ?? []).map((h) => {
    const vals = (entries ?? [])
      .filter((e) => e.habit_id === h.id)
      .sort((a, b) => (a.entry_date < b.entry_date ? -1 : 1))
      .map((e) => `${e.entry_date.slice(5)}: ${Number(e.value)}`)
      .join(", ");
    const goal =
      h.period === "total"
        ? `Langfristiges Ziel: ${Number(h.target)} ${h.unit}${h.deadline ? ` bis ${h.deadline}` : ""}`
        : `${h.direction === "at_least" ? "mindestens" : "höchstens"} ${Number(h.target)} ${h.unit} pro Tag`;
    return `- ${h.emoji} ${h.name} (${goal}). Letzte 14 Tage: ${vals || "keine Einträge"}`;
  });
  const context = `\n\nHeute ist ${format(new Date(), "yyyy-MM-dd")}.\nGewohnheiten der Person:\n${habitLines.join("\n") || "- noch keine angelegt"}`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const history = messages.filter((m) => m.role !== "system").slice(-HISTORY_LIMIT);
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: SYSTEM_PROMPT + context,
    messages: await convertToModelMessages(history, { ignoreIncompleteToolCalls: true }),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onError: (error) => {
        console.error("coach: stream error", error);
        return friendlyError(error);
      },
      onFinish: async ({ responseMessage, isAborted }) => {
        // Aborted turns are saved by the browser.
        if (isAborted || !responseMessage.parts?.length) return;
        const { error } = await supabase
          .from("coach_messages")
          .insert({ user_id: userId, role: "assistant", parts: responseMessage.parts as unknown as Json });
        if (error) console.error("coach: saving assistant message failed", error);
      },
    }),
    runIdFetch,
  );
}
