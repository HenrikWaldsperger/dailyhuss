import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { addDays, format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HabitCard, GoalCard } from "@/components/habits/HabitCard";
import { HabitFormDialog } from "@/components/habits/HabitFormDialog";
import { dayKey, groupEntries, isDayMet, parseDay } from "@/lib/habits";
import { entriesQueryOptions, habitsQueryOptions } from "@/lib/habits-queries";

export const Route = createFileRoute("/_authenticated/heute")({
  head: () => ({
    meta: [
      { title: "Heute – DailyHuss" },
      { name: "description", content: "Deine Gewohnheiten und Ziele für heute auf einen Blick." },
      { property: "og:title", content: "Heute – DailyHuss" },
      { property: "og:description", content: "Deine Gewohnheiten und Ziele für heute auf einen Blick." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(habitsQueryOptions),
      context.queryClient.ensureQueryData(entriesQueryOptions),
    ]),
  component: TodayPage,
});

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Hallo";
  return "Guten Abend";
}

function TodayPage() {
  const { data: habits } = useSuspenseQuery(habitsQueryOptions);
  const { data: entries } = useSuspenseQuery(entriesQueryOptions);
  const today = new Date();
  const todayKey = dayKey(today);
  const [date, setDate] = useState(todayKey);
  const grouped = useMemo(() => groupEntries(entries), [entries]);

  const daily = habits.filter((h) => h.period === "daily");
  const goals = habits.filter((h) => h.period === "total");
  const empty = new Map<string, number>();

  const selected = parseDay(date);
  const doneCount = daily.filter((h) => isDayMet(h, grouped.get(h.id)?.get(date) ?? 0)).length;
  const dayLabel = isToday(selected)
    ? "Heute"
    : isYesterday(selected)
      ? "Gestern"
      : format(selected, "EEEE", { locale: de });

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {format(selected, "EEEE, d. MMMM", { locale: de })}
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">
            {date === todayKey ? greeting(today) : dayLabel}
            <span className="text-accent">.</span>
          </h1>
          {daily.length > 0 && (
            <p className="mt-2 text-muted-foreground">
              {doneCount === daily.length
                ? "Alles erledigt – stark! ✨"
                : `${doneCount} von ${daily.length} Gewohnheiten erfüllt`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl border bg-card p-1 shadow-paper">
            <Button variant="ghost" size="icon" aria-label="Vorheriger Tag" onClick={() => setDate(dayKey(addDays(selected, -1)))}>
              <ChevronLeft />
            </Button>
            <button
              type="button"
              onClick={() => setDate(todayKey)}
              className="min-w-24 px-2 text-sm font-semibold"
            >
              {dayLabel}
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Nächster Tag"
              disabled={date >= todayKey}
              onClick={() => setDate(dayKey(addDays(selected, 1)))}
            >
              <ChevronRight />
            </Button>
          </div>
          <HabitFormDialog
            trigger={
              <Button variant="hero" size="lg">
                <Plus /> Neu
              </Button>
            }
          />
        </div>
      </section>

      {habits.length === 0 && (
        <div className="paper flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="text-5xl">🌱</span>
          <h2 className="text-2xl font-bold">Noch nichts zu tracken</h2>
          <p className="max-w-sm text-muted-foreground">
            Leg deine erste Gewohnheit an – zum Beispiel 8 Gläser Wasser am Tag oder höchstens eine Stunde Social Media.
          </p>
          <HabitFormDialog
            trigger={
              <Button variant="hero" size="lg">
                <Plus /> Erste Gewohnheit anlegen
              </Button>
            }
          />
        </div>
      )}

      {daily.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Täglich</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {daily.map((h) => (
              <HabitCard key={h.id} habit={h} values={grouped.get(h.id) ?? empty} date={date} today={today} />
            ))}
          </div>
        </section>
      )}

      {goals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Langfristige Ziele</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((h) => (
              <GoalCard key={h.id} habit={h} values={grouped.get(h.id) ?? empty} date={date} today={today} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
