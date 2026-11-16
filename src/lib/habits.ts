import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export type HabitDirection = "at_least" | "at_most";
export type HabitPeriod = "daily" | "total";
export const HABIT_COLORS = ["lagoon", "coral", "sun", "moss", "sky", "clay"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  unit: string;
  target: number;
  step: number;
  direction: HabitDirection;
  period: HabitPeriod;
  deadline: string | null;
  archived: boolean;
  created_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  entry_date: string;
  value: number;
}

/** Map of "yyyy-MM-dd" -> value for one habit. */
export type DayValues = Map<string, number>;

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDay(key: string): Date {
  return parseISO(key);
}

export function startDayOf(habit: Pick<Habit, "created_at">): string {
  return dayKey(new Date(habit.created_at));
}

/** Whether a single day's value fulfills a daily habit. */
export function isDayMet(habit: Pick<Habit, "direction" | "target">, value: number): boolean {
  return habit.direction === "at_least" ? value >= habit.target : value <= habit.target;
}

/** Progress for a daily habit as 0..1. For "at_most" this is how much of the budget is used. */
export function dayRatio(habit: Pick<Habit, "target">, value: number): number {
  if (habit.target <= 0) return 0;
  return Math.min(1, Math.max(0, value / habit.target));
}

/**
 * Current streak of consecutive fulfilled days, counting back from `today`.
 * Today only counts when already fulfilled; an unfinished today does not break the streak.
 * Days before the habit was created never count.
 */
export function currentStreak(
  habit: Pick<Habit, "direction" | "target" | "created_at">,
  values: DayValues,
  today: Date,
): number {
  const start = startDayOf(habit);
  let streak = 0;
  let cursor = today;
  const todayKey = dayKey(today);
  if (!isDayMet(habit, values.get(todayKey) ?? 0)) {
    cursor = addDays(today, -1);
  }
  while (dayKey(cursor) >= start) {
    if (!isDayMet(habit, values.get(dayKey(cursor)) ?? 0)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of fulfilled days between creation and `today` (inclusive). */
export function bestStreak(
  habit: Pick<Habit, "direction" | "target" | "created_at">,
  values: DayValues,
  today: Date,
): number {
  const start = parseDay(startDayOf(habit));
  const days = differenceInCalendarDays(today, start);
  let best = 0;
  let run = 0;
  for (let i = 0; i <= days; i++) {
    const key = dayKey(addDays(start, i));
    if (isDayMet(habit, values.get(key) ?? 0)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Share of fulfilled days in the last `windowDays` days (only days since creation count). */
export function successRate(
  habit: Pick<Habit, "direction" | "target" | "created_at">,
  values: DayValues,
  today: Date,
  windowDays = 30,
): number {
  const start = startDayOf(habit);
  let counted = 0;
  let met = 0;
  for (let i = 0; i < windowDays; i++) {
    const key = dayKey(addDays(today, -i));
    if (key < start) break;
    counted += 1;
    if (isDayMet(habit, values.get(key) ?? 0)) met += 1;
  }
  return counted === 0 ? 0 : met / counted;
}

export interface TotalProgress {
  total: number;
  ratio: number;
  remaining: number;
  daysLeft: number | null;
  perDayNeeded: number | null;
  done: boolean;
}

/** Progress for a long-term goal: sum of all entries against the target, with deadline pacing. */
export function totalProgress(
  habit: Pick<Habit, "target" | "deadline">,
  values: DayValues,
  today: Date,
): TotalProgress {
  let total = 0;
  values.forEach((v) => (total += v));
  const remaining = Math.max(0, habit.target - total);
  const done = total >= habit.target;
  let daysLeft: number | null = null;
  let perDayNeeded: number | null = null;
  if (habit.deadline) {
    // Includes today and the deadline day.
    daysLeft = Math.max(0, differenceInCalendarDays(parseDay(habit.deadline), today) + 1);
    perDayNeeded = done ? 0 : daysLeft > 0 ? remaining / daysLeft : null;
  }
  return {
    total,
    ratio: habit.target > 0 ? Math.min(1, total / habit.target) : 0,
    remaining,
    daysLeft,
    perDayNeeded,
    done,
  };
}

export function groupEntries(entries: HabitEntry[]): Map<string, DayValues> {
  const out = new Map<string, DayValues>();
  for (const e of entries) {
    let m = out.get(e.habit_id);
    if (!m) {
      m = new Map();
      out.set(e.habit_id, m);
    }
    m.set(e.entry_date, Number(e.value));
  }
  return out;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);
}

export interface HabitTemplate {
  name: string;
  emoji: string;
  color: HabitColor;
  unit: string;
  target: number;
  step: number;
  direction: HabitDirection;
  period: HabitPeriod;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { name: "Wasser trinken", emoji: "💧", color: "lagoon", unit: "Gläser", target: 8, step: 1, direction: "at_least", period: "daily" },
  { name: "Social Media", emoji: "📱", color: "coral", unit: "Min", target: 60, step: 15, direction: "at_most", period: "daily" },
  { name: "Lernen", emoji: "📚", color: "sun", unit: "Min", target: 30, step: 15, direction: "at_least", period: "daily" },
  { name: "Schritte", emoji: "🚶", color: "moss", unit: "Schritte", target: 8000, step: 1000, direction: "at_least", period: "daily" },
  { name: "Meditieren", emoji: "🧘", color: "sky", unit: "Min", target: 10, step: 5, direction: "at_least", period: "daily" },
  { name: "Buch zu Ende lesen", emoji: "📖", color: "clay", unit: "Seiten", target: 300, step: 10, direction: "at_least", period: "total" },
  { name: "100 Stunden Sprache lernen", emoji: "🗣️", color: "sun", unit: "Std", target: 100, step: 0.5, direction: "at_least", period: "total" },
];
