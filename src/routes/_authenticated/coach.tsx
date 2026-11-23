import { useEffect, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import coachAvatar from "@/assets/coach-tung.webp";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clearCoachMessages, coachMessagesQueryOptions, saveAssistantMessage } from "@/lib/coach-queries";

const COACH_NAME = "Tung Tung Tung Sahur";

export const Route = createFileRoute("/_authenticated/coach")({
  validateSearch: z.object({ frage: z.string().max(500).optional() }),
  head: () => ({
    meta: [
      { title: "Coach – DailyHuss" },
      { name: "description", content: "Frag deinen Coach nach Übungen, Workouts und Tipps für deine Gewohnheiten." },
      { property: "og:title", content: "Coach – DailyHuss" },
      { property: "og:description", content: "Frag deinen Coach nach Übungen, Workouts und Tipps für deine Gewohnheiten." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coachMessagesQueryOptions),
  component: CoachPage,
});

const SUGGESTIONS = [
  "Stell mir ein 15-Minuten-Workout ohne Geräte zusammen.",
  "Wie trinke ich über den Tag verteilt genug Wasser?",
  "Gib mir Tipps gegen zu viel Bildschirmzeit.",
  "Wie lerne ich jeden Tag 30 Minuten, ohne aufzugeben?",
];

function CoachPage() {
  const { frage } = Route.useSearch();
  return (
    <PromptInputProvider initialInput={frage ?? ""}>
      <CoachChat />
    </PromptInputProvider>
  );
}

function messageText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function CoachChat() {
  const { user } = Route.useRouteContext();
  const { data: initialMessages } = useSuspenseQuery(coachMessagesQueryOptions);
  const qc = useQueryClient();
  const controller = usePromptInputController();
  const abortSaved = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: `coach-${user.id}`,
    messages: initialMessages,
    transport,
    onError: (e) => {
      let msg = e.message;
      try {
        const parsed = JSON.parse(msg) as { error?: string };
        if (parsed.error) msg = parsed.error;
      } catch {
        /* plain text */
      }
      toast.error(msg || "Der Coach konnte gerade nicht antworten.");
    },
    onFinish: async ({ message, messages: all, isAbort }) => {
      if (isAbort && !abortSaved.current) {
        abortSaved.current = true;
        const parts = message.parts.map((p) => ({ ...p })) as UIMessage["parts"];
        const lastText = [...parts].reverse().find((p) => p.type === "text") as { type: "text"; text: string } | undefined;
        if (lastText) lastText.text = `${lastText.text}\n\n_Gestoppt._`;
        else parts.push({ type: "text", text: "_Gestoppt._" });
        try {
          await saveAssistantMessage(parts);
        } catch (err) {
          console.error("Gestoppte Antwort konnte nicht gespeichert werden", err);
        }
      }
      qc.setQueryData(["coach"], all);
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    if (status === "submitted" || status === "streaming") abortSaved.current = false;
  }, [status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const waiting = busy && (lastMessage?.role === "user" || (lastMessage && !messageText(lastMessage)));

  function handleSubmit(msg: PromptInputMessage) {
    const text = msg.text.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    controller.textInput.clear();
  }

  async function resetChat() {
    try {
      stop();
      await clearCoachMessages(user.id);
      setMessages([]);
      qc.setQueryData(["coach"], []);
      textareaRef.current?.focus();
    } catch {
      toast.error("Chat konnte nicht zurückgesetzt werden.");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-12rem)] md:h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <header className="flex items-center gap-4 pb-4">
        <img src={coachAvatar} alt={COACH_NAME} width={56} height={56} className="h-14 w-14 rounded-full shadow-paper" />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{COACH_NAME}</h1>
          <p className="text-sm text-muted-foreground">Dein Coach für Übungen, Workouts und Tipps – tung tung tung!</p>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <RotateCcw /> Neu starten
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Chat neu starten?</AlertDialogTitle>
                <AlertDialogDescription>Der bisherige Verlauf mit dem Coach wird gelöscht.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={resetChat}>Neu starten</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      <Conversation className="paper min-h-0 flex-1">
        <ConversationContent className="gap-6 p-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <img src={coachAvatar} alt="" width={112} height={112} className="h-28 w-28 rounded-full" />
              <div>
                <p className="font-display text-xl font-bold">Tung tung tung! Wobei soll ich dir helfen?</p>
                <p className="mt-1 text-sm text-muted-foreground">Ich kenne deine Gewohnheiten und gebe dir passende Übungen und Tipps.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal py-2 text-left"
                    onClick={() => void sendMessage({ text: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <Message key={m.id} from={m.role}>
                <MessageContent className="text-base group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, j) => {
                    if (p.type === "text") {
                      return m.role === "user" ? (
                        <p key={j} className="whitespace-pre-wrap">{p.text}</p>
                      ) : (
                        <MessageResponse key={j} isAnimating={isLast && status === "streaming"}>
                          {p.text}
                        </MessageResponse>
                      );
                    }
                    if (p.type === "reasoning" && p.text) {
                      return (
                        <Reasoning key={j} isStreaming={isLast && status === "streaming" && p.state === "streaming"} defaultOpen={false}>
                          <ReasoningTrigger
                            getThinkingMessage={(streaming) =>
                              streaming ? <Shimmer duration={1}>Überlegt…</Shimmer> : <p>Gedanken anzeigen</p>
                            }
                          />
                          <ReasoningContent>{p.text}</ReasoningContent>
                        </Reasoning>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            );
          })}
          {waiting && (
            <div className="flex items-center gap-3">
              <img src={coachAvatar} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
              <Shimmer duration={1.2}>Tung tung tung … überlegt</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-3 rounded-2xl bg-card shadow-paper">
        <PromptInputTextarea ref={textareaRef} placeholder="Frag nach einer Übung oder einem Tipp …" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !controller.textInput.value.trim()} className="rounded-full" />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
