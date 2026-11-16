import { describe, expect, it } from "vitest";
import { bestStreak, currentStreak, isDayMet, successRate, totalProgress, type DayValues } from "./habits";

const today = new Date(2026, 10, 16); // 16 Nov 2026
const water = { direction: "at_least" as const, target: 8, created_at: "2026-11-01T08:00:00" };
const screen = { direction: "at_most" as const, target: 60, created_at: "2026-11-10T08:00:00" };
const v = (o: Record<string, number>): DayValues => new Map(Object.entries(o));

describe("habit rules", () => {
  it("'mindestens' goal is met when the value reaches the target", () => {
    expect(isDayMet(water, 8)).toBe(true);
    expect(isDayMet(water, 7)).toBe(false);
  });

  it("'höchstens' goal is met while the value stays at or below the limit", () => {
    expect(isDayMet(screen, 60)).toBe(true);
    expect(isDayMet(screen, 61)).toBe(false);
  });

  it("an unfinished today does not break the streak", () => {
    const values = v({ "2026-11-15": 8, "2026-11-14": 9, "2026-11-13": 2, "2026-11-16": 3 });
    expect(currentStreak(water, values, today)).toBe(2);
  });

  it("a fulfilled today extends the streak", () => {
    const values = v({ "2026-11-16": 8, "2026-11-15": 8 });
    expect(currentStreak(water, values, today)).toBe(2);
  });

  it("days before the habit was created never count", () => {
    // screen time created 10 Nov, nothing logged = always under the limit
    expect(currentStreak(screen, v({}), today)).toBe(7);
    expect(bestStreak(screen, v({ "2026-11-12": 90 }), today)).toBe(4);
  });

  it("success rate only counts days since creation", () => {
    expect(successRate(screen, v({ "2026-11-12": 90 }), today, 30)).toBeCloseTo(6 / 7);
  });

  it("long-term goal sums all entries and paces against the deadline", () => {
    const p = totalProgress({ target: 300, deadline: "2026-11-25" }, v({ a: 100, b: 50 }), today);
    expect(p.total).toBe(150);
    expect(p.remaining).toBe(150);
    expect(p.daysLeft).toBe(10);
    expect(p.perDayNeeded).toBe(15);
    expect(p.done).toBe(false);
  });
});
