import { useMemo } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
import { HabitFormDialog } from "@/components/habits/HabitFormDialog";
import {
  bestStreak,
  currentStreak,
  dayKey,
  formatNumber,
  groupEntries,
  isDayMet,
  parseDay,
  successRate,
  totalProgress,
  type DayValues,
  type Habit,
} from "@/lib/habits";
import { entriesQueryOptions, habitsQueryOptions, useDeleteHabit } from "@/lib/habits-queries";

export const Route = createFileRoute("/_authenticated/habits/$habitId")({
  head: () => ({
    meta: [
      { title: "Verlauf – Tagwerk" },
      { name: "description", content: "Verlauf, Serien und Statistiken deiner Gewohnheit." },
      { property: "og:title", content: "Verlauf – Tagwerk" },
      { property: "og:description", content: "Verlauf, Serien und Statistiken deiner Gewohnheit." },
    ],
  }),
  loader: async ({ context, params }) => {
    const [habits] = await Promise.all([
      context.queryClient.ensureQueryData(habitsQueryOptions),
      context.queryClient.ensureQueryData(entriesQueryOptions),
    ]);
    if (!habits.some((h) => h.id === params.habitId)) throw notFound();
  },
  notFoundComponent: () => (
    <div className="paper mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl font-bold">Nicht gefunden</h1>
      <p className="mt-2 text-muted-foreground">Diese Gewohnheit gibt es nicht (mehr).</p>
      <Button asChild className="mt-6">
        <Link to="/heute">Zurück zu Heute</Link>
      </Button>
    </div>
  ),
  component: HabitDetail,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="paper p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function HabitDetail() {
  const { habitId } = Route.useParams();
  const { data: habits } = useSuspenseQuery(habitsQueryOptions);
  const { data: entries } = useSuspenseQuery(entriesQueryOptions);
  const habit = habits.find((h) => h.id === habitId);
  const values = useMemo(() => groupEntries(entries).get(habitId) ?? new Map<string, number>(), [entries, habitId]);
  const navigate = useNavigate();
  const del = useDeleteHabit();

  if (!habit) return null;
  const today = new Date();

  async function onDelete() {
    try {
      await del.mutateAsync(habitId);
      toast.success("Gelöscht");
      navigate({ to: "/heute" });
    } catch {
      toast.error("Löschen hat nicht geklappt.");
    }
  }

  return (
    <div data-habit={habit.color} className="space-y-8">
      <Link to="/heute" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Heute
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-habit/15 text-4xl">{habit.emoji}</span>
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{habit.name}</h1>
            <p className="text-muted-foreground">
              {habit.period === "total"
                ? `Langfristiges Ziel: ${formatNumber(habit.target)} ${habit.unit}`
                : `${habit.direction === "at_least" ? "Mindestens" : "Höchstens"} ${formatNumber(habit.target)} ${habit.unit} pro Tag`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <HabitFormDialog
            habit={habit}
            trigger={
              <Button variant="outline">
                <Pencil /> Bearbeiten
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 /> Löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>„{habit.name}“ löschen?</AlertDialogTitle>
                <AlertDialogDescription>Alle Einträge dazu werden ebenfalls gelöscht. Das lässt sich nicht rückgängig machen.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {habit.period === "daily" ? (
        <DailyStats habit={habit} values={values} today={today} />
      ) : (
        <TotalStats habit={habit} values={values} today={today} />
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 13,
};

function DailyStats({ habit, values, today }: { habit: Habit; values: DayValues; today: Date }) {
  const data = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i - 29);
    const v = values.get(dayKey(d)) ?? 0;
    return { day: format(d, "d.M."), value: v, met: isDayMet(habit, v) };
  });
  const last7 = data.slice(-7);
  const avg7 = last7.reduce((s, d) => s + d.value, 0) / 7;
  const streak = currentStreak(habit, values, today);
  const best = bestStreak(habit, values, today);
  const rate = successRate(habit, values, today, 30);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktuelle Serie" value={`${streak} 🔥`} hint={streak === 1 ? "Tag" : "Tage"} />
        <Stat label="Beste Serie" value={String(best)} hint="Tage" />
        <Stat label="Erfolgsquote" value={`${Math.round(rate * 100)}%`} hint="letzte 30 Tage" />
        <Stat label="Ø pro Tag" value={formatNumber(avg7)} hint={`${habit.unit} · letzte 7 Tage`} />
      </div>
      <section className="paper p-5">
        <h2 className="mb-4 text-lg font-bold">Letzte 30 Tage</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} interval={4} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${formatNumber(v)} ${habit.unit}`, habit.name]}
              />
              <ReferenceLine
                y={habit.target}
                stroke="var(--accent)"
                strokeDasharray="5 4"
                label={{ value: habit.direction === "at_least" ? "Ziel" : "Limit", position: "insideTopRight", fill: "var(--accent)", fontSize: 11 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--habit)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <HistoryList habit={habit} values={values} />
    </>
  );
}

function TotalStats({ habit, values, today }: { habit: Habit; values: DayValues; today: Date }) {
  const p = totalProgress(habit, values, today);
  const keys = [...values.keys()].sort();
  const startKey = keys[0] ?? dayKey(today);
  let acc = 0;
  const data: { day: string; total: number }[] = [];
  for (let d = parseDay(startKey); dayKey(d) <= dayKey(today); d = addDays(d, 1)) {
    acc += values.get(dayKey(d)) ?? 0;
    data.push({ day: format(d, "d.M."), total: acc });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fortschritt" value={`${Math.round(p.ratio * 100)}%`} />
        <Stat label="Geschafft" value={formatNumber(p.total)} hint={habit.unit} />
        <Stat label="Noch offen" value={formatNumber(p.remaining)} hint={habit.unit} />
        <Stat
          label={habit.deadline ? "Pro Tag nötig" : "Frist"}
          value={habit.deadline ? (p.perDayNeeded != null ? formatNumber(p.perDayNeeded) : "–") : "keine"}
          hint={
            habit.deadline
              ? `${habit.unit} · ${p.daysLeft} Tage bis ${format(parseDay(habit.deadline), "d. MMM", { locale: de })}`
              : undefined
          }
        />
      </div>
      <section className="paper p-5">
        <h2 className="mb-4 text-lg font-bold">Verlauf</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" domain={[0, Math.max(habit.target, acc)]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${formatNumber(v)} ${habit.unit}`, "Gesamt"]} />
              <ReferenceLine y={habit.target} stroke="var(--accent)" strokeDasharray="5 4" label={{ value: "Ziel", position: "insideTopRight", fill: "var(--accent)", fontSize: 11 }} />
              <Area type="monotone" dataKey="total" stroke="var(--habit)" strokeWidth={2.5} fill="var(--habit)" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <HistoryList habit={habit} values={values} />
    </>
  );
}

function HistoryList({ habit, values }: { habit: Habit; values: DayValues }) {
  const rows = [...values.entries()].filter(([, v]) => v > 0).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  if (rows.length === 0) return null;
  return (
    <section className="paper p-5">
      <h2 className="mb-3 text-lg font-bold">Letzte Einträge</h2>
      <ul className="divide-y divide-dashed">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between py-2.5 text-sm">
            <span>{format(parseDay(k), "EEEE, d. MMMM", { locale: de })}</span>
            <span className="flex items-center gap-2 font-semibold tabular">
              {formatNumber(v)} {habit.unit}
              {habit.period === "daily" && (
                <span className={isDayMet(habit, v) ? "text-success" : "text-destructive"}>{isDayMet(habit, v) ? "✓" : "✗"}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
