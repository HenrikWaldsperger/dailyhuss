import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { Flame, Minus, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";
import {
  currentStreak,
  dayKey,
  dayRatio,
  formatNumber,
  isDayMet,
  parseDay,
  startDayOf,
  totalProgress,
  type DayValues,
  type Habit,
} from "@/lib/habits";
import { useSetEntry } from "@/lib/habits-queries";

interface CardProps {
  habit: Habit;
  values: DayValues;
  date: string;
  today: Date;
}

function ValueEditor({ value, onCommit, className }: { value: number; onCommit: (v: number) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft.replace(",", "."));
          if (draft.trim() !== "" && Number.isFinite(n) && n >= 0) onCommit(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className={cn("w-16 rounded-md bg-background text-center tabular outline-none ring-2 ring-primary", className)}
      />
    );
  }
  return (
    <button
      type="button"
      title="Genauen Wert eingeben"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={cn("tabular rounded-md px-1 hover:bg-habit/10", className)}
    >
      {formatNumber(value)}
    </button>
  );
}

export function HabitCard({ habit, values, date, today }: CardProps) {
  const setEntry = useSetEntry();
  const value = values.get(date) ?? 0;
  const met = isDayMet(habit, value);
  const over = habit.direction === "at_most" && value > habit.target;
  const ratio = dayRatio(habit, value);
  const streak = currentStreak(habit, values, today);
  const start = startDayOf(habit);
  const [pulse, setPulse] = useState(0);

  const change = (v: number) => {
    setEntry.mutate({ habitId: habit.id, date, value: Math.round(v * 100) / 100 });
    setPulse((p) => p + 1);
  };

  let status: string;
  if (habit.direction === "at_least") {
    status = met ? "Geschafft! 🎉" : `noch ${formatNumber(habit.target - value)} ${habit.unit}`;
  } else {
    status = over
      ? `${formatNumber(value - habit.target)} ${habit.unit} drüber`
      : `noch ${formatNumber(habit.target - value)} ${habit.unit} übrig`;
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(parseDay(date), i - 6));

  return (
    <article data-habit={habit.color} className="paper group flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
      <header className="flex items-start justify-between gap-3">
        <Link to="/habits/$habitId" params={{ habitId: habit.id }} className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-habit/15 text-2xl">{habit.emoji}</span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">
              {habit.direction === "at_least" ? "mind." : "max."} {formatNumber(habit.target)} {habit.unit} / Tag
            </p>
          </div>
        </Link>
        <Link
          to="/habits/$habitId"
          params={{ habitId: habit.id }}
          aria-label="Details"
          className="rounded-full p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:opacity-100"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </header>

      <div className="flex items-center gap-4">
        <ProgressRing ratio={ratio} over={over} size={84}>
          <span key={pulse} className={cn("text-2xl", pulse > 0 && "animate-pop")}>
            {met && !over ? "✓" : habit.emoji}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 font-display text-3xl font-bold">
            <ValueEditor value={value} onCommit={change} className="text-3xl" />
            <span className="text-base font-medium text-muted-foreground">
              / {formatNumber(habit.target)} {habit.unit}
            </span>
          </div>
          <p className={cn("text-sm font-medium", over ? "text-destructive" : met ? "text-success" : "text-muted-foreground")}>
            {status}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="habit-soft" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Weniger" disabled={value <= 0} onClick={() => change(Math.max(0, value - habit.step))}>
          <Minus />
        </Button>
        <Button variant="habit" className="h-11 flex-1 rounded-2xl text-base" onClick={() => change(value + habit.step)}>
          <Plus /> {formatNumber(habit.step)} {habit.unit}
        </Button>
      </div>

      <footer className="flex items-center justify-between border-t border-dashed pt-3">
        <div className="flex gap-1.5">
          {week.map((d) => {
            const k = dayKey(d);
            const before = k < start;
            const v = values.get(k) ?? 0;
            const ok = !before && isDayMet(habit, v);
            const isFuture = d > today;
            return (
              <div key={k} className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase text-muted-foreground">{format(d, "EEEEEE", { locale: de })}</span>
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full",
                    before || isFuture ? "border border-dashed border-border" : ok ? "bg-habit" : "bg-habit/15",
                    k === date && "ring-2 ring-foreground/40 ring-offset-1 ring-offset-card",
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-semibold", streak > 0 ? "text-accent" : "text-muted-foreground")}>
          <Flame className="h-4 w-4" />
          {streak} {streak === 1 ? "Tag" : "Tage"}
        </div>
      </footer>
    </article>
  );
}

export function GoalCard({ habit, values, date, today }: CardProps) {
  const setEntry = useSetEntry();
  const p = totalProgress(habit, values, today);
  const todayValue = values.get(date) ?? 0;
  const add = (delta: number) =>
    setEntry.mutate({ habitId: habit.id, date, value: Math.max(0, Math.round((todayValue + delta) * 100) / 100) });

  return (
    <article data-habit={habit.color} className="paper flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
      <header className="flex items-start justify-between gap-3">
        <Link to="/habits/$habitId" params={{ habitId: habit.id }} className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-habit/15 text-2xl">{habit.emoji}</span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">
              Ziel: {formatNumber(habit.target)} {habit.unit}
              {habit.deadline && ` bis ${format(parseDay(habit.deadline), "d. MMM yyyy", { locale: de })}`}
            </p>
          </div>
        </Link>
        <span className="font-display text-2xl font-bold tabular">{Math.round(p.ratio * 100)}%</span>
      </header>

      <div className="h-4 overflow-hidden rounded-full bg-habit/15">
        <div className="h-full rounded-full bg-habit transition-[width] duration-500" style={{ width: `${p.ratio * 100}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          <strong className="tabular">{formatNumber(p.total)}</strong> {habit.unit} geschafft
        </span>
        <span className="text-muted-foreground">
          {p.done
            ? "Ziel erreicht! 🏆"
            : p.perDayNeeded != null
              ? `≈ ${formatNumber(p.perDayNeeded)} ${habit.unit}/Tag nötig`
              : p.daysLeft === 0 && habit.deadline
                ? "Frist abgelaufen"
                : `noch ${formatNumber(p.remaining)} ${habit.unit}`}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-dashed pt-3">
        <span className="mr-auto text-sm text-muted-foreground">
          An diesem Tag: <strong className="tabular text-foreground">{formatNumber(todayValue)}</strong> {habit.unit}
        </span>
        <Button variant="habit-soft" size="icon" className="rounded-xl" aria-label="Weniger" disabled={todayValue <= 0} onClick={() => add(-habit.step)}>
          <Minus />
        </Button>
        <Button variant="habit" className="rounded-xl" onClick={() => add(habit.step)}>
          <Plus /> {formatNumber(habit.step)}
        </Button>
      </div>
    </article>
  );
}
