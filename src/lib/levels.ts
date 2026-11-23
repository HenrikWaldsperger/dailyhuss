import { addDays, differenceInCalendarDays } from "date-fns";
import {
  dayKey,
  isDayMet,
  parseDay,
  startDayOf,
  totalProgress,
  type DayValues,
  type Habit,
} from "./habits";

/** XP rules. */
export const XP_PER_MET_DAY = 10;
export const XP_PER_WEEK_STREAK = 25; // every full 7-day run in a row
export const XP_PER_GOAL_PERCENT = 1; // long-term goals: 1 XP per percent of progress
export const XP_GOAL_COMPLETED = 100;

type H = Pick<Habit, "id" | "direction" | "target" | "created_at" | "period" | "deadline">;

export interface HabitStats {
  /** Total fulfilled days across all daily habits. */
  metDays: number;
  /** Longest streak across all daily habits. */
  bestStreak: number;
  /** Days on which at least 2 daily habits existed and all of them were met. */
  perfectDays: number;
  /** Number of completed long-term goals. */
  goalsCompleted: number;
  /** Number of habits/goals created. */
  habitCount: number;
  xp: number;
}

/**
 * Whether a day earns XP. Logged days use the normal goal rule. Unlogged past days count only for
 * "at most" habits (nothing logged = stayed under the limit); an unlogged today never counts yet.
 */
export function dayCounts(h: Pick<Habit, "direction" | "target">, value: number | undefined, key: string, todayKey: string): boolean {
  if (value !== undefined) return isDayMet(h, value);
  return h.direction === "at_most" && key < todayKey;
}

export function computeStats(habits: H[], grouped: Map<string, DayValues>, today: Date): HabitStats {
  let xp = 0;
  let metDays = 0;
  let best = 0;
  let goalsCompleted = 0;
  const todayKey = dayKey(today);
  const daily = habits.filter((h) => h.period === "daily");

  for (const h of daily) {
    const values = grouped.get(h.id) ?? new Map<string, number>();
    const start = parseDay(startDayOf(h));
    const days = differenceInCalendarDays(today, start);
    let run = 0;
    for (let i = 0; i <= days; i++) {
      const key = dayKey(addDays(start, i));
      const v = values.get(key);
      const met = dayCounts(h, v, key, todayKey);
      if (met) {
        metDays += 1;
        run += 1;
        if (run % 7 === 0) xp += XP_PER_WEEK_STREAK;
        best = Math.max(best, run);
      } else if (key !== todayKey) {
        run = 0;
      }
    }
  }
  xp += metDays * XP_PER_MET_DAY;

  for (const h of habits.filter((x) => x.period === "total")) {
    const p = totalProgress(h, grouped.get(h.id) ?? new Map(), today);
    xp += Math.floor(p.ratio * 100) * XP_PER_GOAL_PERCENT;
    if (p.done) {
      goalsCompleted += 1;
      xp += XP_GOAL_COMPLETED;
    }
  }

  // Perfect days
  let perfectDays = 0;
  const allDays = new Set<string>();
  for (const h of daily) grouped.get(h.id)?.forEach((_, k) => allDays.add(k));
  for (const k of allDays) {
    if (k > todayKey) continue;
    const active = daily.filter((h) => startDayOf(h) <= k);
    if (active.length < 2) continue;
    if (
      active.every((h) => {
        return dayCounts(h, grouped.get(h.id)?.get(k), k, todayKey);
      })
    ) {
      perfectDays += 1;
    }
  }

  return { metDays, bestStreak: best, perfectDays, goalsCompleted, habitCount: habits.length, xp };
}

/** XP needed to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return 100 + 50 * (level - 1);
}

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpToReach(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForNextLevel(l);
  return total;
}

export interface LevelInfo {
  level: number;
  xp: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP the current level spans. */
  levelSpan: number;
  ratio: number;
  title: LevelTitle;
  nextTitle: LevelTitle | null;
}

export interface LevelTitle {
  minLevel: number;
  name: string;
  emoji: string;
}

export const LEVEL_TITLES: LevelTitle[] = [
  { minLevel: 1, name: "Neuling", emoji: "🌱" },
  { minLevel: 2, name: "Starter", emoji: "🌿" },
  { minLevel: 4, name: "Dranbleiber", emoji: "🔥" },
  { minLevel: 6, name: "Gewohnheitstier", emoji: "🦊" },
  { minLevel: 9, name: "Durchzieher", emoji: "⚡" },
  { minLevel: 13, name: "Meister", emoji: "🏆" },
  { minLevel: 18, name: "Legende", emoji: "👑" },
];

export function titleForLevel(level: number): LevelTitle {
  let t = LEVEL_TITLES[0]!;
  for (const lt of LEVEL_TITLES) if (level >= lt.minLevel) t = lt;
  return t;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpToReach(level + 1)) level += 1;
  const base = xpToReach(level);
  const span = xpForNextLevel(level);
  const title = titleForLevel(level);
  const nextTitle = LEVEL_TITLES.find((t) => t.minLevel > level) ?? null;
  return { level, xp, intoLevel: xp - base, levelSpan: span, ratio: (xp - base) / span, title, nextTitle };
}

export interface Badge {
  key: string;
  name: string;
  emoji: string;
  description: string;
  earned: (s: HabitStats, level: number) => boolean;
}

export const BADGES: Badge[] = [
  { key: "first_habit", name: "Losgelegt", emoji: "✏️", description: "Lege deine erste Gewohnheit an.", earned: (s) => s.habitCount >= 1 },
  { key: "first_day", name: "Erster Schritt", emoji: "👣", description: "Erfülle zum ersten Mal ein Tagesziel.", earned: (s) => s.metDays >= 1 },
  { key: "variety", name: "Vielseitig", emoji: "🎨", description: "Tracke drei Gewohnheiten oder Ziele gleichzeitig.", earned: (s) => s.habitCount >= 3 },
  { key: "streak_3", name: "Warmgelaufen", emoji: "🔥", description: "Halte eine Serie von 3 Tagen.", earned: (s) => s.bestStreak >= 3 },
  { key: "streak_7", name: "Wochenheld", emoji: "📅", description: "Halte eine Serie von 7 Tagen.", earned: (s) => s.bestStreak >= 7 },
  { key: "streak_30", name: "Eiserner Wille", emoji: "🛡️", description: "Halte eine Serie von 30 Tagen.", earned: (s) => s.bestStreak >= 30 },
  { key: "perfect_day", name: "Perfekter Tag", emoji: "🌟", description: "Erfülle an einem Tag alle (mind. 2) Gewohnheiten.", earned: (s) => s.perfectDays >= 1 },
  { key: "perfect_10", name: "Zehnmal perfekt", emoji: "💎", description: "Sammle 10 perfekte Tage.", earned: (s) => s.perfectDays >= 10 },
  { key: "days_50", name: "Fleißig", emoji: "🐝", description: "Erfülle insgesamt 50 Tagesziele.", earned: (s) => s.metDays >= 50 },
  { key: "days_200", name: "Unaufhaltsam", emoji: "🚀", description: "Erfülle insgesamt 200 Tagesziele.", earned: (s) => s.metDays >= 200 },
  { key: "goal_done", name: "Ziel erreicht", emoji: "🎯", description: "Schließe ein langfristiges Ziel ab.", earned: (s) => s.goalsCompleted >= 1 },
  { key: "level_5", name: "Level 5", emoji: "🥉", description: "Erreiche Level 5.", earned: (_s, l) => l >= 5 },
  { key: "level_10", name: "Level 10", emoji: "🥈", description: "Erreiche Level 10.", earned: (_s, l) => l >= 10 },
  { key: "level_20", name: "Level 20", emoji: "🥇", description: "Erreiche Level 20.", earned: (_s, l) => l >= 20 },
];

/** Keys of every reward currently earned: badges plus one `level:N` key per reached level above 1. */
export function earnedRewardKeys(stats: HabitStats): string[] {
  const { level } = levelFromXp(stats.xp);
  const keys = BADGES.filter((b) => b.earned(stats, level)).map((b) => `badge:${b.key}`);
  for (let l = 2; l <= level; l++) keys.push(`level:${l}`);
  return keys;
}

export interface RewardInfo {
  emoji: string;
  name: string;
  description: string;
}

export function describeReward(key: string): RewardInfo | null {
  if (key.startsWith("level:")) {
    const level = Number(key.slice(6));
    const title = titleForLevel(level);
    return {
      emoji: title.emoji,
      name: `Level ${level} erreicht`,
      description: title.minLevel === level ? `Neuer Titel freigeschaltet: „${title.name}“` : `Du bist jetzt ${title.name} auf Level ${level}.`,
    };
  }
  if (key.startsWith("badge:")) {
    const b = BADGES.find((x) => x.key === key.slice(6));
    return b ? { emoji: b.emoji, name: b.name, description: b.description } : null;
  }
  return null;
}
