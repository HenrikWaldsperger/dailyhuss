import { describe, expect, it } from "vitest";
import { computeStats, earnedRewardKeys, levelFromXp, xpToReach } from "./levels";
import type { DayValues } from "./habits";

const today = new Date(2026, 10, 23, 12);
const created = new Date(2026, 10, 1, 8).toISOString();

function daily(id: string, target = 8) {
  return { id, direction: "at_least" as const, target, created_at: created, period: "daily" as const, deadline: null };
}
function days(from: number, to: number, value: number): DayValues {
  const m: DayValues = new Map();
  for (let d = from; d <= to; d++) m.set(`2026-11-${String(d).padStart(2, "0")}`, value);
  return m;
}

describe("levels", () => {
  it("level thresholds: level 2 at 100 XP, level 3 at 250 XP", () => {
    expect(xpToReach(2)).toBe(100);
    expect(xpToReach(3)).toBe(250);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(250).level).toBe(3);
  });

  it("each fulfilled day gives 10 XP", () => {
    const s = computeStats([daily("a")], new Map([["a", days(1, 3, 8)]]), today);
    expect(s.metDays).toBe(3);
    expect(s.xp).toBe(30);
  });

  it("a full 7-day streak adds a 25 XP bonus", () => {
    const s = computeStats([daily("a")], new Map([["a", days(1, 7, 8)]]), today);
    expect(s.bestStreak).toBe(7);
    expect(s.xp).toBe(70 + 25);
  });

  it("completing a long-term goal gives 100 XP plus 1 XP per percent", () => {
    const goal = { id: "g", direction: "at_least" as const, target: 10, created_at: created, period: "total" as const, deadline: null };
    const s = computeStats([goal], new Map([["g", days(1, 1, 10)]]), today);
    expect(s.goalsCompleted).toBe(1);
    expect(s.xp).toBe(200);
  });

  it("a perfect day needs at least two daily habits, all met", () => {
    const s = computeStats(
      [daily("a"), daily("b", 2)],
      new Map([["a", days(5, 6, 8)], ["b", days(6, 6, 2)]]),
      today,
    );
    expect(s.perfectDays).toBe(1);
    expect(earnedRewardKeys(s)).toContain("badge:perfect_day");
  });

  it("'at most' habits earn XP for unlogged past days, but not for an unlogged today", () => {
    const social = { id: "s", direction: "at_most" as const, target: 60, created_at: new Date(2026, 10, 21, 8).toISOString(), period: "daily" as const, deadline: null };
    const s = computeStats([social], new Map(), today);
    expect(s.metDays).toBe(2); // 21st and 22nd; the 23rd (today) is not over yet
  });
});
